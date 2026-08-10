import { Controller, Get, HttpStatus, Res, UseGuards } from "@nestjs/common";
import type { Response } from "express";
import { PrismaService } from "../prisma/prisma.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PlatformAdminGuard } from "../common/guards/platform-admin.guard";

@Controller("health")
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async check(@Res() res: Response): Promise<void> {
    let dbOk = false;
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      dbOk = true;
    } catch {
      dbOk = false;
    }

    const status = dbOk ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE;
    res.status(status).json({ status: dbOk ? "ok" : "degraded", db: dbOk });
  }

  // CA-01 (spec 044): endpoint de diagnóstico pra provar que exceções não
  // tratadas chegam no GlitchTip — restrito a super_admin (mesmo padrão do
  // service-ping do spec 032), nunca público, pra não virar vetor de abuso.
  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @Get("throw-test-error")
  throwTestError(): never {
    throw new Error("Erro de teste proposital — spec 044, validação do GlitchTip.");
  }
}
