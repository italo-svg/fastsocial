import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { HealthChecker, ServiceHealth, runWithTimeout } from "./checker.types";

@Injectable()
export class DatabaseChecker implements HealthChecker {
  readonly name = "database";

  constructor(private readonly prisma: PrismaService) {}

  check(): Promise<ServiceHealth> {
    return runWithTimeout(this.name, async () => {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: "up" };
    });
  }
}
