import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { WorkspaceGuard } from "../common/guards/workspace.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentWorkspace, CurrentWorkspacePayload } from "../common/decorators/current-workspace.decorator";
import { BillingService } from "./billing.service";
import { CheckoutSessionDto } from "./dto/checkout-session.dto";

@UseGuards(JwtAuthGuard, WorkspaceGuard, RolesGuard)
@Controller("billing")
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Get("plans")
  plans() {
    return this.billingService.listPlans();
  }

  @Roles("workspace_admin", "super_admin")
  @Post("checkout-session")
  checkoutSession(@CurrentWorkspace() workspace: CurrentWorkspacePayload, @Body() dto: CheckoutSessionDto) {
    return this.billingService.createCheckoutSession(workspace.id, dto.planKey);
  }

  @Roles("workspace_admin", "super_admin")
  @Post("portal-session")
  portalSession(@CurrentWorkspace() workspace: CurrentWorkspacePayload) {
    return this.billingService.createPortalSession(workspace.id);
  }
}
