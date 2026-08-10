import { Injectable, Logger, NotFoundException, NotImplementedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Stripe from "stripe";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PrismaService } from "../prisma/prisma.service";

export interface BillingPlan {
  key: string;
  name: string;
  priceMonthlyCents: number;
  currency: string;
  maxSocialAccounts: number;
  maxPostsPerMonth: number;
  stripeProductId?: string;
  stripePriceId?: string;
}

// spec 053: mesma seção addons do plans.json, formato compartilhado com
// scripts/setup-stripe-products.ts.
export interface AddonProduct {
  key: string;
  name: string;
  priceMonthlyCents: number;
  currency: string;
  stripeProductId?: string;
  stripePriceId?: string;
}

// infra/billing/plans.json é a fonte da verdade compartilhada com
// scripts/setup-stripe-products.ts (roda fora do Docker, direto no
// repositório). O container da API não empacota infra/ na imagem (o
// Dockerfile de apps/api só tem apps/api como build context) — em produção
// este arquivo é montado como volume read-only em /app/infra/billing/plans.json
// (ver infra/DEPLOYMENT-ATUAL.md); em dev local cai no fallback relativo.
function resolvePlansPath(): string {
  const candidates = [
    "/app/infra/billing/plans.json",
    join(__dirname, "../../../../infra/billing/plans.json"),
    join(process.cwd(), "../../infra/billing/plans.json"),
  ];
  const found = candidates.find((candidate) => existsSync(candidate));
  if (!found) {
    throw new Error(`infra/billing/plans.json não encontrado (candidatos: ${candidates.join(", ")}).`);
  }
  return found;
}

export const TRIAL_LIMITS = { maxSocialAccounts: 1, maxPostsPerMonth: 20 };

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);
  private stripeClient: Stripe | null = null;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  isConfigured(): boolean {
    return !!this.config.get<string>("STRIPE_SECRET_KEY");
  }

  // CA-06: sem STRIPE_SECRET_KEY, todo o módulo degrada para 501 sem afetar
  // o resto da API — mesmo padrão já usado para Unsplash/fal.ai/Anthropic
  // (specs 016/017/018).
  private requireConfigured(): void {
    if (!this.isConfigured()) {
      throw new NotImplementedException("Billing não configurado (STRIPE_SECRET_KEY ausente).");
    }
  }

  private get stripe(): Stripe {
    this.requireConfigured();
    if (!this.stripeClient) {
      this.stripeClient = new Stripe(this.config.get<string>("STRIPE_SECRET_KEY")!);
    }
    return this.stripeClient;
  }

  private loadPlansFile(): { plans: BillingPlan[]; addons?: AddonProduct[] } {
    return JSON.parse(readFileSync(resolvePlansPath(), "utf8")) as { plans: BillingPlan[]; addons?: AddonProduct[] };
  }

  loadPlans(): BillingPlan[] {
    return this.loadPlansFile().plans;
  }

  listPlans(): BillingPlan[] {
    this.requireConfigured();
    return this.loadPlans();
  }

  loadAddons(): AddonProduct[] {
    return this.loadPlansFile().addons ?? [];
  }

  findAddon(addonKey: string): AddonProduct {
    const addon = this.loadAddons().find((a) => a.key === addonKey);
    if (!addon) throw new NotFoundException(`Add-on "${addonKey}" não encontrado em plans.json.`);
    if (!addon.stripePriceId) {
      throw new NotFoundException(
        `Add-on "${addonKey}" ainda não tem stripePriceId — rode scripts/setup-stripe-products.ts primeiro.`,
      );
    }
    return addon;
  }

  private findPlan(planKey: string): BillingPlan {
    const plan = this.loadPlans().find((p) => p.key === planKey);
    if (!plan) throw new NotFoundException(`Plano "${planKey}" não encontrado em plans.json.`);
    if (!plan.stripePriceId) {
      throw new NotFoundException(
        `Plano "${planKey}" ainda não tem stripePriceId — rode scripts/setup-stripe-products.ts primeiro.`,
      );
    }
    return plan;
  }

  private async ensureCustomer(workspaceId: string): Promise<string> {
    const subscription = await this.prisma.subscription.findUniqueOrThrow({ where: { workspaceId } });
    if (subscription.stripeCustomerId) return subscription.stripeCustomerId;

    const workspace = await this.prisma.workspace.findUniqueOrThrow({ where: { id: workspaceId } });
    const customer = await this.stripe.customers.create({
      name: workspace.name,
      metadata: { workspaceId },
    });
    await this.prisma.subscription.update({
      where: { workspaceId },
      data: { stripeCustomerId: customer.id },
    });
    return customer.id;
  }

  async createCheckoutSession(workspaceId: string, planKey: string): Promise<{ url: string }> {
    const plan = this.findPlan(planKey);
    const customerId = await this.ensureCustomer(workspaceId);
    const appBaseUrl = this.config.get<string>("APP_BASE_URL");

    const session = await this.stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: [{ price: plan.stripePriceId, quantity: 1 }],
      success_url: `${appBaseUrl}/settings/billing?checkout=success`,
      cancel_url: `${appBaseUrl}/settings/billing?checkout=cancelled`,
      metadata: { workspaceId, planKey },
    });

    if (!session.url) throw new Error("Stripe não retornou uma URL de Checkout.");
    return { url: session.url };
  }

  // spec 053, item 1: item de add-on vai na MESMA assinatura Stripe do plano
  // base (fatura única) — nunca cria uma assinatura paralela. Sem
  // stripeSubscriptionId salvo (workspace ainda em trial, nunca completou um
  // Checkout pago), falha com mensagem clara em vez de tentar adivinhar.
  private async getActiveStripeSubscriptionId(workspaceId: string): Promise<string> {
    const subscription = await this.prisma.subscription.findUniqueOrThrow({ where: { workspaceId } });
    if (!subscription.stripeSubscriptionId) {
      throw new NotFoundException(
        "Workspace ainda não tem uma assinatura Stripe ativa — assine um plano pago antes de contratar um add-on.",
      );
    }
    return subscription.stripeSubscriptionId;
  }

  async createAddonSubscriptionItem(workspaceId: string, addonKey: string): Promise<Stripe.SubscriptionItem> {
    const addon = this.findAddon(addonKey);
    const stripeSubscriptionId = await this.getActiveStripeSubscriptionId(workspaceId);
    return this.stripe.subscriptionItems.create({
      subscription: stripeSubscriptionId,
      price: addon.stripePriceId!,
      metadata: { workspaceId, addonKey },
    });
  }

  async cancelAddonSubscriptionItem(stripeSubscriptionItemId: string): Promise<void> {
    await this.stripe.subscriptionItems.del(stripeSubscriptionItemId);
  }

  async createPortalSession(workspaceId: string): Promise<{ url: string }> {
    const subscription = await this.prisma.subscription.findUniqueOrThrow({ where: { workspaceId } });
    if (!subscription.stripeCustomerId) {
      throw new NotFoundException("Workspace ainda não tem um customer no Stripe — nenhuma assinatura para gerenciar.");
    }
    const appBaseUrl = this.config.get<string>("APP_BASE_URL");
    const session = await this.stripe.billingPortal.sessions.create({
      customer: subscription.stripeCustomerId,
      return_url: `${appBaseUrl}/settings/billing`,
    });
    return { url: session.url };
  }

  // CA-03: validação de assinatura via constructEvent — lança se a assinatura
  // não confere (payload forjado ou STRIPE_WEBHOOK_SECRET errada), o que o
  // controller traduz em 400 antes de qualquer processamento de negócio.
  constructWebhookEvent(rawBody: Buffer, signature: string): Stripe.Event {
    const webhookSecret = this.config.get<string>("STRIPE_WEBHOOK_SECRET");
    if (!webhookSecret) {
      throw new NotImplementedException("STRIPE_WEBHOOK_SECRET não configurada.");
    }
    return this.stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  }
}
