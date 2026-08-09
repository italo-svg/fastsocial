import { Controller, Get, HttpStatus, Res } from "@nestjs/common";
import type { Response } from "express";
import { PrismaService } from "../prisma/prisma.service";

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
}
