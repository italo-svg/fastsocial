import { Injectable, Logger } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import type { INestApplication } from "@nestjs/common";
import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { ExpressAdapter } from "@bull-board/express";
import * as jwt from "jsonwebtoken";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../prisma/prisma.service";

const BULL_BOARD_ROUTE = "/api/v1/admin/queues";

// Bull Board como sub-rota da própria API (spec 044) — evita mais um
// serviço/subdomínio. Montado como Express puro (não rotas NestJS normais,
// é como o pacote @bull-board/express funciona), então a proteção por
// super_admin (CA-03) é um middleware Express manual em vez de um Guard do
// Nest — verifica o MESMO JWT do Supabase que o SupabaseJwtStrategy usa, e
// confirma isPlatformSuperAdmin=true igual ao PlatformAdminGuard (spec 041).
@Injectable()
export class BullBoardService {
  private readonly logger = new Logger(BullBoardService.name);

  constructor(
    @InjectQueue("publish") private readonly publishQueue: Queue,
    @InjectQueue("data-export") private readonly dataExportQueue: Queue,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  mount(app: INestApplication): void {
    const serverAdapter = new ExpressAdapter();
    serverAdapter.setBasePath(BULL_BOARD_ROUTE);

    // Cast: @bull-board/api trava o tipo de progress do Job em number|object,
    // mas a versão instalada do bullmq (^5.34) permite string também —
    // incompatibilidade só de tipos entre as duas libs, não de runtime (o
    // pacote funciona normalmente com qualquer Queue real do BullMQ).
    createBullBoard({
      queues: [new BullMQAdapter(this.publishQueue), new BullMQAdapter(this.dataExportQueue)],
      serverAdapter,
    });

    const httpAdapter = app.getHttpAdapter().getInstance();
    httpAdapter.use(BULL_BOARD_ROUTE, this.requireSuperAdmin(), serverAdapter.getRouter());
    this.logger.log(`Bull Board montado em ${BULL_BOARD_ROUTE} (protegido por super_admin).`);
  }

  private requireSuperAdmin() {
    return async (req: { headers: Record<string, string | string[] | undefined> }, res: any, next: (err?: unknown) => void) => {
      try {
        const authHeader = req.headers["authorization"];
        const headerValue = Array.isArray(authHeader) ? authHeader[0] : authHeader;
        const token = headerValue?.startsWith("Bearer ") ? headerValue.slice(7) : undefined;
        if (!token) {
          res.status(401).send("Token ausente.");
          return;
        }
        const secret = this.config.getOrThrow<string>("SUPABASE_JWT_SECRET");
        const payload = jwt.verify(token, secret) as { sub: string };
        const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
        if (!user?.isPlatformSuperAdmin) {
          res.status(403).send("Ação restrita ao super admin da plataforma.");
          return;
        }
        next();
      } catch {
        res.status(401).send("Token inválido.");
      }
    };
  }
}
