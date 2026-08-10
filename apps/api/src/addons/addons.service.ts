import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { BillingService } from "../billing/billing.service";
import { AuditLogService } from "../common/services/audit-log.service";

export interface AddonStatus {
  key: string;
  name: string;
  priceMonthlyCents: number;
  currency: string;
  status: "active" | "cancelled" | "not_subscribed";
}

@Injectable()
export class AddonsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly billingService: BillingService,
    private readonly auditLog: AuditLogService,
  ) {}

  async listAddons(workspaceId: string): Promise<AddonStatus[]> {
    const catalog = this.billingService.loadAddons();
    const workspaceAddons = await this.prisma.workspaceAddon.findMany({ where: { workspaceId } });
    const byKey = new Map(workspaceAddons.map((a) => [a.addonKey, a]));

    return catalog.map((addon) => ({
      key: addon.key,
      name: addon.name,
      priceMonthlyCents: addon.priceMonthlyCents,
      currency: addon.currency,
      status: (byKey.get(addon.key)?.status as "active" | "cancelled" | undefined) ?? "not_subscribed",
    }));
  }

  // CA-02/CA-05: só cria o item na assinatura existente (fatura única) — a
  // ativação real de workspace_addons acontece no webhook
  // customer.subscription.updated (mesmo padrão do plano base, spec 040),
  // não aqui na resposta síncrona.
  async subscribe(workspaceId: string, addonKey: string, userId: string): Promise<{ status: "pending_webhook" }> {
    const existing = await this.prisma.workspaceAddon.findUnique({
      where: { workspaceId_addonKey: { workspaceId, addonKey } },
    });
    if (existing?.status === "active") {
      throw new BadRequestException(`Add-on "${addonKey}" já está ativo para este workspace.`);
    }

    await this.billingService.createAddonSubscriptionItem(workspaceId, addonKey);

    await this.auditLog.record({
      workspaceId,
      userId,
      action: "addon_subscribe_requested",
      entityType: "workspace_addon",
      metadata: { addonKey },
    });

    return { status: "pending_webhook" };
  }

  // CA-04: nunca deleta automation_flows — só desativa (is_active=false
  // forçado) e marca o add-on como cancelled, preservando histórico caso o
  // cliente recontrate depois.
  async cancel(workspaceId: string, addonKey: string, userId: string): Promise<{ status: "cancelled" }> {
    const existing = await this.prisma.workspaceAddon.findUnique({
      where: { workspaceId_addonKey: { workspaceId, addonKey } },
    });
    if (!existing || existing.status !== "active") {
      throw new NotFoundException(`Add-on "${addonKey}" não está ativo para este workspace.`);
    }

    if (existing.stripeSubscriptionItemId) {
      await this.billingService.cancelAddonSubscriptionItem(existing.stripeSubscriptionItemId);
    }

    await this.prisma.$transaction([
      this.prisma.workspaceAddon.update({
        where: { workspaceId_addonKey: { workspaceId, addonKey } },
        data: { status: "cancelled" },
      }),
      this.prisma.automationFlow.updateMany({ where: { workspaceId }, data: { isActive: false } }),
    ]);

    await this.auditLog.record({
      workspaceId,
      userId,
      action: "addon_cancelled",
      entityType: "workspace_addon",
      metadata: { addonKey },
    });

    return { status: "cancelled" };
  }
}
