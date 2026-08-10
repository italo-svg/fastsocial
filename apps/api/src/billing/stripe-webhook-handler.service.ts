import { Injectable, Logger } from "@nestjs/common";
import type Stripe from "stripe";
import { PrismaService } from "../prisma/prisma.service";
import { AuditLogService } from "../common/services/audit-log.service";
import { BillingService, TRIAL_LIMITS } from "./billing.service";

@Injectable()
export class StripeWebhookHandlerService {
  private readonly logger = new Logger(StripeWebhookHandlerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly billingService: BillingService,
    private readonly auditLog: AuditLogService,
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

    const previousSubscription = await this.prisma.subscription.findUnique({ where: { workspaceId } });
    const wasTrial = previousSubscription?.planType === "trial";

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

    // CA-01 (spec 042): mudança de plano auditada. Sem userId — quem "agiu"
    // aqui foi o webhook assíncrono do Stripe, não uma requisição autenticada.
    await this.auditLog.record({
      workspaceId,
      action: "billing_plan_changed",
      entityType: "subscription",
      metadata: { planKey: plan.key, stripeSessionId: session.id },
    });

    // trial_converted_to_paid (spec 046): só quando a assinatura ANTERIOR era
    // trial — troca entre dois planos pagos não é uma conversão de funil.
    // Este evento nasce de um webhook assíncrono do Stripe (sem browser/
    // sessão ativa), então não passa pelo endpoint público POST /funnel/events
    // — grava direto, reusando o anonymous_id mais recente já associado a
    // algum membro do workspace pra manter a mesma linha de atribuição
    // first-touch em vez de começar uma nova identidade "do servidor".
    if (wasTrial) {
      await this.recordTrialConvertedEvent(workspaceId);
    }
  }

  private async recordTrialConvertedEvent(workspaceId: string): Promise<void> {
    const admin = await this.prisma.workspaceMember.findFirst({
      where: { workspaceId, role: { in: ["workspace_admin", "super_admin"] } },
      orderBy: { joinedAt: "asc" },
    });
    if (!admin) return;

    const priorEvent = await this.prisma.funnelEvent.findFirst({
      where: { userId: admin.userId },
      orderBy: { occurredAt: "asc" },
    });
    const anonymousId = priorEvent?.anonymousId ?? `server:${admin.userId}`;

    await this.prisma.funnelEvent.create({
      data: { anonymousId, userId: admin.userId, workspaceId, eventName: "trial_converted_to_paid" },
    });
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
    // Cast: a API do Stripe ainda retorna current_period_end no nível da
    // subscription (não só por item), mas os tipos do SDK v17 não o expõem
    // mais em Stripe.Subscription — cast pragmático em vez de reestruturar
    // em torno de um tipo desatualizado do próprio pacote.
    const currentPeriodEnd = (subscription as unknown as { current_period_end?: number }).current_period_end;
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
