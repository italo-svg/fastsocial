import { Controller, Param, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { WorkspaceGuard } from "../common/guards/workspace.guard";
import { CurrentWorkspace, CurrentWorkspacePayload } from "../common/decorators/current-workspace.decorator";
import { QaVisionService } from "./qa-vision.service";

// Endpoint sincrono em vez de worker BullMQ — desvio consciente do spec 018 (mesma
// linha do spec 013/016: evitar infra nova no MVP). O job ja fica em estado
// consultavel via banco assim que o spec 017 o cria; este endpoint apenas dispara a
// avaliacao. Uma fila de verdade pode substituir esta chamada direta depois sem
// mudar o contrato de dados (image_generation_jobs continua a fonte da verdade).
@UseGuards(JwtAuthGuard, WorkspaceGuard)
@Controller("image-generation")
export class QaVisionController {
  constructor(private readonly qaVisionService: QaVisionService) {}

  @Post("jobs/:id/qa")
  evaluate(@CurrentWorkspace() workspace: CurrentWorkspacePayload, @Param("id") id: string) {
    return this.qaVisionService.evaluate(workspace.id, id);
  }
}
