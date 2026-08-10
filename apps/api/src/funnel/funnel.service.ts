import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as jwt from "jsonwebtoken";
import { PrismaService } from "../prisma/prisma.service";
import { RecordFunnelEventDto } from "./dto/record-funnel-event.dto";

export interface OptionalAuthContext {
  userId?: string;
}

@Injectable()
export class FunnelService {
  private readonly logger = new Logger(FunnelService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  // CA-03: autenticacao OPCIONAL de proposito — boa parte do funil acontece
  // antes do login (landing_viewed, signup_started). Verifica o MESMO JWT do
  // Supabase que o SupabaseJwtStrategy usa, mas nunca lanca: token
  // ausente/invalido so significa "evento anonimo", nao um erro 401.
  extractOptionalAuth(authHeader: string | undefined): OptionalAuthContext {
    if (!authHeader?.startsWith("Bearer ")) return {};
    try {
      const secret = this.config.getOrThrow<string>("SUPABASE_JWT_SECRET");
      const payload = jwt.verify(authHeader.slice(7), secret) as { sub: string };
      return { userId: payload.sub };
    } catch {
      return {};
    }
  }

  async recordEvent(dto: RecordFunnelEventDto, auth: OptionalAuthContext) {
    let workspaceId: string | undefined;

    if (auth.userId) {
      // Item 4 do spec: assim que o anonymous_id aparece numa chamada JA
      // autenticada, todo o historico anonimo dele (linhas com user_id NULL)
      // vira desse usuario de uma vez. Cobre o momento exato em que o
      // frontend deixa de ser anonimo, sem precisar de um hook separado no
      // fluxo de signup (Supabase Auth é client-side, o backend só sabe que
      // alguem logou quando o primeiro request autenticado chega).
      await this.prisma.funnelEvent.updateMany({
        where: { anonymousId: dto.anonymousId, userId: null },
        data: { userId: auth.userId },
      });

      const membership = await this.prisma.workspaceMember.findFirst({
        where: { userId: auth.userId },
        orderBy: { joinedAt: "asc" },
      });
      workspaceId = membership?.workspaceId;
    }

    // Item 3 do spec (first-touch attribution): se este anonymous_id já tem
    // um UTM gravado antes, ele "gruda" — ignora o UTM desta chamada (mesmo
    // que venha preenchido) e reusa o original em vez de sobrescrever.
    let utm = dto.utm;
    const existingUtm = await this.prisma.funnelEvent.findFirst({
      where: { anonymousId: dto.anonymousId, utmSource: { not: null } },
      orderBy: { occurredAt: "asc" },
    });
    if (existingUtm) {
      utm = {
        source: existingUtm.utmSource ?? undefined,
        medium: existingUtm.utmMedium ?? undefined,
        campaign: existingUtm.utmCampaign ?? undefined,
        term: existingUtm.utmTerm ?? undefined,
        content: existingUtm.utmContent ?? undefined,
      };
    }

    const event = await this.prisma.funnelEvent.create({
      data: {
        anonymousId: dto.anonymousId,
        userId: auth.userId,
        workspaceId,
        eventName: dto.eventName,
        utmSource: utm?.source,
        utmMedium: utm?.medium,
        utmCampaign: utm?.campaign,
        utmTerm: utm?.term,
        utmContent: utm?.content,
        metadata: dto.metadata ?? {},
      },
    });

    this.logger.debug(`Evento de funil gravado: ${dto.eventName} (anonymousId=${dto.anonymousId})`);
    return event;
  }
}
