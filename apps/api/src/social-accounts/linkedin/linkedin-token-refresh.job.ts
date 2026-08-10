import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { PrismaService } from "../../prisma/prisma.service";
import { LinkedInOAuthService } from "./linkedin-oauth.service";

const RENEW_WINDOW_MS = 7 * 24 * 60 * 60 * 1000; // renova com 7 dias de antecedência

// CA-05: varre diariamente as contas LinkedIn perto de expirar e renova
// proativamente, sem exigir reconexão manual do usuário dentro da janela
// normal (ver limitação de refresh_token documentada em
// LinkedInOAuthService#refreshAccessToken).
@Injectable()
export class LinkedInTokenRefreshJob {
  private readonly logger = new Logger(LinkedInTokenRefreshJob.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly linkedInOAuthService: LinkedInOAuthService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async renewExpiringTokens(): Promise<void> {
    if (!this.linkedInOAuthService.isConfigured()) {
      return;
    }

    const expiringSoon = await this.prisma.socialAccount.findMany({
      where: {
        network: "linkedin",
        status: "connected",
        tokenExpiresAt: { lt: new Date(Date.now() + RENEW_WINDOW_MS) },
      },
    });

    if (expiringSoon.length === 0) {
      return;
    }

    this.logger.log(`Renovando ${expiringSoon.length} token(s) LinkedIn perto de expirar.`);
    for (const account of expiringSoon) {
      try {
        await this.linkedInOAuthService.refreshAccessToken(account.id);
      } catch (error) {
        this.logger.error(`Falha ao renovar token da conta ${account.id}: ${(error as Error).message}`);
      }
    }
  }
}
