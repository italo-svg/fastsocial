import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit(): Promise<void> {
    // Nao deixar falha de conexao no boot derrubar a aplicacao inteira -
    // o health check (GET /api/v1/health) e quem deve reportar o banco
    // como indisponivel; a API continua de pe para outras rotas/diagnostico.
    try {
      await this.$connect();
      this.logger.log("Conectado ao Postgres (Supabase self-hosted).");
    } catch (error) {
      this.logger.error("Falha ao conectar ao Postgres no boot — API sobe mesmo assim.", error as Error);
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
