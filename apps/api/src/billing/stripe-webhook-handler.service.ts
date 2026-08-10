import { Injectable, Logger } from "@nestjs/common";
import type Stripe from "stripe";
import { PrismaService } from "../prisma/prisma.service";
import { BillingService, TRIAL_LIMITS } from "./billing.service";

@Injectable()
export class StripeWebhookHandlerService {
  private readonly logger = new Logger(StripeWebhookHandlerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly billingService: BillingService,
  ) {}

  async handle(event: Stripe.Event): Promise<void> {
    switch (event.type) {
      case "checkout.session.completed":
        await this.onCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      case "customer.subscription.updated":
        await this.onSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;
      case "customer.subscription.deleted":
        await this.onSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      case "invoice.payment_failed":
        await this.onPaymentFailed(event.data.object as Stripe.Invoice);
        break;
      default:
        this.logger.log(`Evento Stripe ignorado (sem handler): ${event.type}`);
    }
  }

  // CA-02: aplica os limites do plano comprado (max_social_accounts,
  // max_posts_per_month) assim que o Checkout é concluído — é este webhook,
  // não a resposta síncrona de createCheckoutSession, que efetivamente ativa
  // a assinatura (o usuário pode fechar a aba antes do webhook chegar).
  private async onCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
    const workspaceId = session.metadata?.workspaceId;
    const planKey = session.metadata?.planKey;
    if (!workspaceId || !planKey) {
      this.logger.warn(`checkout.session.completed sem workspaceId/planKey nos metadata (session ${session.id}).`);
      return;
    }

    const plan = this.billingService.loadPlans().find((p) => p.key === planKey);
    if (!plan) {
      this.logger.error(`checkout.session.completed referencia plano desconhecido "${planKey}".`);
      return;
    }

    await this.prisma.subscription.update({
      where: { workspaceId },
      data: {
        planType: plan.key,
        maxSocialAccounts: plan.maxSocialAccounts,
        maxPostsPerMonth: plan.maxPostsPerMonth,
        billingStatus: "active",
        currentPeriodEnd: session.expires_at ? new Date(session.expires_at * 1000) : undefined,
      },
    });
    this.logger.log(`Workspace ${workspaceId} assinou o plano "${plan.key}" via Checkout ${session.id}.`);
  }

  private async findWorkspaceIdByCustomer(customerId: string): Promise<string | null> {
    const subscription = await this.prisma.subscription.findFirst({ where: { stripeCustomerId: customerId } });
    return subscription?.workspaceId ?? null;
  }

  private async onSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
    const workspaceId = await this.findWorkspaceIdByCustomer(subscription.customer as string);
    if (!workspaceId) {
      this.logger.warn(`customer.subscription.updated sem workspace correspondente (customer ${subscription.customer}).`);
      return;
    }
    const currentPeriodEnd = subscription.items.data[0]?.current_period_end;
    await this.prisma.subscription.update({
      where: { workspaceId },
      data: {
        billingStatus: subscription.status === "active" ? "active" : subscription.status,
        currentPeriodEnd: currentPeriodEnd ? new Date(currentPeriodEnd * 1000) : undefined,
      },
    });
  }

  // CA-05 (via spec 003): reverter para os limites de trial ao cancelar é o
  // que faz o trigger enforce_monthly_post_limit já existente voltar a
  // bloquear no limite mínimo — não precisamos duplicar lógica de
  // enforcement aqui, só manter subscriptions.max_* correto.
  private async onSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
    const workspaceId = await this.findWorkspaceIdByCustomer(subscription.customer as string);
    if (!workspaceId) return;
    await this.prisma.subscription.update({
      where: { workspaceId },
      data: {
        planType: "trial",
        maxSocialAccounts: TRIAL_LIMITS.maxSocialAccounts,
        maxPostsPerMonth: TRIAL_LIMITS.maxPostsPerMonth,
        billingStatus: "cancelled",
      },
    });
    this.logger.log(`Workspace ${workspaceId} teve a assinatura cancelada — revertido para trial.`);
  }

  // CA-04: marca past_due mas NUNCA suspende o workspace aqui — período de
  // graça é a ausência de qualquer bloqueio automático neste handler; a UI
  // (spec 041/dashboard) é responsável por mostrar o aviso.
  private async onPaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    const customerId = invoice.customer as string | null;
    if (!customerId) return;
    const workspaceId = await this.findWorkspaceIdByCustomer(customerId);
    if (!workspaceId) return;
    await this.prisma.subscription.update({ where: { workspaceId }, data: { billingStatus: "past_due" } });
    this.logger.warn(`Pagamento falhou para o workspace ${workspaceId} — billing_status='past_due' (sem suspensão).`);
  }
}
