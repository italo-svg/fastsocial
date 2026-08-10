import { Injectable, NotImplementedException } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { PrismaService } from "../prisma/prisma.service";
import { AnthropicService, AnthropicToolDefinition } from "../common/services/anthropic.service";
import { HelpCenterService } from "../help-center/help-center.service";
import { SendMessageDto } from "./dto/send-message.dto";

export interface SupportChatResponse {
  reply: string;
  resolved: boolean;
  suggestedArticles: { slug: string; title: string }[];
  conversationId: string;
}

interface SupportChatToolResult {
  reply?: string;
  resolved?: boolean;
  suggestedArticleSlugs?: string[];
}

const SUPPORT_CHAT_TOOL: AnthropicToolDefinition = {
  name: "submit_support_response",
  description: "Envia a resposta de suporte estruturada.",
  input_schema: {
    type: "object",
    properties: {
      reply: { type: "string", description: "Resposta em português do Brasil pro usuário." },
      resolved: {
        type: "boolean",
        description: "true só se a dúvida foi genuinamente respondida com base nos artigos/contexto fornecidos.",
      },
      suggestedArticleSlugs: {
        type: "array",
        items: { type: "string" },
        description: "Slugs dos artigos fornecidos que foram realmente úteis pra esta resposta (vazio se nenhum).",
      },
    },
    required: ["reply", "resolved", "suggestedArticleSlugs"],
  },
};

@Injectable()
export class SupportChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly anthropic: AnthropicService,
    private readonly helpCenterService: HelpCenterService,
  ) {}

  async sendMessage(workspaceId: string, userId: string, dto: SendMessageDto): Promise<SupportChatResponse> {
    if (!this.anthropic.isConfigured()) {
      throw new NotImplementedException("Chat de suporte não configurado (ANTHROPIC_API_KEY ausente).");
    }

    const [articles, accountContext] = await Promise.all([
      this.retrieveRelevantArticles(dto.message),
      this.buildAccountContext(workspaceId),
    ]);

    const articlesBlock =
      articles.length > 0
        ? articles.map((a) => `[${a.slug}] ${a.title}\n${a.contentMarkdown}`).join("\n\n---\n\n")
        : "(nenhum artigo da central de ajuda encontrado com termos relacionados à pergunta)";

    const result = await this.anthropic.completeWithTool<SupportChatToolResult>({
      system:
        "Você é o assistente de suporte do FastSocial. Responda a dúvida do usuário SOMENTE com base nos " +
        "artigos da central de ajuda e no contexto da conta fornecidos abaixo — nunca invente informação " +
        "que não esteja neles. Se os artigos fornecidos não cobrirem a pergunta com segurança, admita que " +
        "não sabe e recomende falar com o suporte humano em vez de arriscar uma resposta genérica. Marque " +
        "resolved=true apenas quando a resposta foi de fato fundamentada no material fornecido.",
      prompt:
        `Contexto da conta do usuário:\n${accountContext}\n\n` +
        `Artigos da central de ajuda relacionados à pergunta:\n${articlesBlock}\n\n` +
        `Pergunta do usuário: "${dto.message}"`,
      tool: SUPPORT_CHAT_TOOL,
      maxTokens: 600,
    });

    const resolved = result.resolved ?? false;
    const reply = result.reply ?? "Não consegui montar uma resposta agora — tente falar com o suporte humano.";
    const suggestedArticles = (result.suggestedArticleSlugs ?? [])
      .map((slug) => articles.find((a) => a.slug === slug))
      .filter((a): a is (typeof articles)[number] => !!a)
      .map((a) => ({ slug: a.slug, title: a.title }));

    await this.recordFunnelOutcome(userId, workspaceId, resolved);

    return {
      reply,
      resolved,
      suggestedArticles,
      conversationId: dto.conversationId ?? randomUUID(),
    };
  }

  // Item "Busca semântica" do spec: sem vector DB no MVP — extrai palavras
  // relevantes da pergunta (>=4 letras, sem duplicar) e reusa a mesma busca
  // ILIKE do spec 050 (HelpCenterService), OR entre elas, até 5 artigos.
  private async retrieveRelevantArticles(message: string) {
    const keywords = Array.from(
      new Set(
        message
          .toLowerCase()
          .normalize("NFD")
          .replace(/[̀-ͯ]/g, "")
          .split(/[^a-z0-9]+/)
          .filter((word) => word.length >= 4),
      ),
    ).slice(0, 5);

    if (keywords.length === 0) return [];

    const resultsPerKeyword = await Promise.all(keywords.map((kw) => this.helpCenterService.listPublishedArticles(kw)));
    const byId = new Map<string, (typeof resultsPerKeyword)[number][number]>();
    for (const results of resultsPerKeyword) {
      for (const article of results) byId.set(article.id, article);
    }
    return Array.from(byId.values()).slice(0, 5);
  }

  // CA-03: dados reais da conta, nunca inventados — mesmas tabelas já
  // usadas pelo resto do produto (subscription/social_accounts/autopilot).
  private async buildAccountContext(workspaceId: string): Promise<string> {
    const [subscription, connectedAccounts, autopilot, recentPublications] = await Promise.all([
      this.prisma.subscription.findUnique({ where: { workspaceId } }),
      this.prisma.socialAccount.count({ where: { workspaceId, status: "connected" } }),
      this.prisma.autopilotPipeline.findUnique({ where: { workspaceId } }),
      this.prisma.publication.count({
        where: {
          socialAccount: { workspaceId },
          status: "published",
          publishedAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        },
      }),
    ]);

    return [
      `Plano: ${subscription?.planType ?? "trial"} (status de cobrança: ${subscription?.billingStatus ?? "desconhecido"}).`,
      connectedAccounts > 0
        ? `${connectedAccounts} conta(s) social(is) conectada(s).`
        : "Nenhuma conta social conectada ainda.",
      autopilot?.isActive ? "Piloto automático ATIVO." : "Piloto automático NÃO está ativo.",
      `${recentPublications} publicação(ões) publicada(s) nos últimos 30 dias.`,
    ].join(" ");
  }

  // Nota de implementação do spec: métrica de sucesso do PRD (dúvidas
  // resolvidas sem escalar >= 50%) precisa ser mensurável mesmo sem tabela
  // própria de conversas — reusa funnel_events (spec 046) como contador agregado.
  private async recordFunnelOutcome(userId: string, workspaceId: string, resolved: boolean): Promise<void> {
    const priorEvent = await this.prisma.funnelEvent.findFirst({ where: { userId }, orderBy: { occurredAt: "asc" } });
    const anonymousId = priorEvent?.anonymousId ?? `server:${userId}`;
    await this.prisma.funnelEvent.create({
      data: {
        anonymousId,
        userId,
        workspaceId,
        eventName: resolved ? "support_chat_resolved" : "support_chat_escalated",
      },
    });
  }
}
