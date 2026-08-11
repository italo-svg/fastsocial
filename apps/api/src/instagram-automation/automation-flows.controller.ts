import { Body, Controller, Get, Param, Post, Put, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { WorkspaceGuard } from "../common/guards/workspace.guard";
import { AddonGuard } from "../common/guards/addon.guard";
import { RequiresAddon } from "../common/decorators/requires-addon.decorator";
import { CurrentWorkspace, CurrentWorkspacePayload } from "../common/decorators/current-workspace.decorator";
import { AutomationFlowsService } from "./automation-flows.service";
import { CreateAutomationFlowDto, UpdateAutomationFlowDto } from "./dto/automation-flow.dto";

// CA-01: AddonGuard roda depois do WorkspaceGuard (precisa de
// request.workspaceId resolvido) e devolve 402 com upsell pra quem não tem
// o add-on — o frontend usa esse 402 pra decidir entre mostrar a lista ou o UpsellCard.
@UseGuards(JwtAuthGuard, WorkspaceGuard, AddonGuard)
@RequiresAddon("instagram_automation")
@Controller("automations")
export class AutomationFlowsController {
  constructor(private readonly automationFlowsService: AutomationFlowsService) {}

  @Get()
  list(@CurrentWorkspace() workspace: CurrentWorkspacePayload) {
    return this.automationFlowsService.list(workspace.id);
  }

  @Post()
  create(@CurrentWorkspace() workspace: CurrentWorkspacePayload, @Body() dto: CreateAutomationFlowDto) {
    return this.automationFlowsService.create(workspace.id, dto);
  }

  @Get(":id")
  getDetail(@CurrentWorkspace() workspace: CurrentWorkspacePayload, @Param("id") id: string) {
    return this.automationFlowsService.getDetail(workspace.id, id);
  }

  @Put(":id")
  update(
    @CurrentWorkspace() workspace: CurrentWorkspacePayload,
    @Param("id") id: string,
    @Body() dto: UpdateAutomationFlowDto,
  ) {
    return this.automationFlowsService.update(workspace.id, id, dto);
  }
}
