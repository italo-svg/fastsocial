import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { DEFAULT_PROMPTS, KNOWN_PROMPT_KEYS, PromptKey } from "./default-prompts";

@Injectable()
export class SystemPromptsService {
  private readonly logger = new Logger(SystemPromptsService.name);
  // Cache em memória (item 3 do spec) — invalidado ativamente a cada PUT/rollback
  // em vez de TTL, pra nunca servir conteúdo desatualizado por até N segundos
  // logo depois de uma edição do Super Admin.
  private readonly cache = new Map<string, string>();

  constructor(private readonly prisma: PrismaService) {}

  private assertKnownKey(key: string): asserts key is PromptKey {
    if (!KNOWN_PROMPT_KEYS.includes(key as PromptKey)) {
      throw new NotFoundException(`prompt_key desconhecida: "${key}".`);
    }
  }

  // Usado pelos módulos de IA (copy-generation, scene-director, qa-vision,
  // prompt-builder) — nunca lança por linha ausente no banco: cai pro
  // DEFAULT_PROMPTS em memória (CA-05, nunca quebra geração por seed atrasado).
  async get(key: PromptKey): Promise<string> {
    const cached = this.cache.get(key);
    if (cached !== undefined) return cached;

    const row = await this.prisma.systemPrompt.findUnique({ where: { promptKey: key } });
    const content = row?.content ?? DEFAULT_PROMPTS[key];
    if (!row) {
      this.logger.warn(`system_prompts sem linha para "${key}" — usando DEFAULT_PROMPTS em memória (seed não rodou?).`);
    }
    this.cache.set(key, content);
    return content;
  }

  async listAll() {
    const rows = await this.prisma.systemPrompt.findMany({ orderBy: { promptKey: "asc" } });
    const byKey = new Map(rows.map((r) => [r.promptKey, r]));
    // Inclui as keys conhecidas que ainda não têm linha no banco (pré-seed),
    // com o default em memória — o Super Admin vê todas as 8 prompts sempre,
    // nunca uma lista incompleta.
    return KNOWN_PROMPT_KEYS.map((key) => {
      const row = byKey.get(key);
      return row
        ? { promptKey: row.promptKey, currentVersion: row.currentVersion, content: row.content, updatedAt: row.updatedAt }
        : { promptKey: key, currentVersion: 0, content: DEFAULT_PROMPTS[key], updatedAt: null };
    });
  }

  async getOne(key: string) {
    this.assertKnownKey(key);
    const row = await this.prisma.systemPrompt.findUnique({ where: { promptKey: key } });
    return row ?? { promptKey: key, currentVersion: 0, content: DEFAULT_PROMPTS[key], updatedAt: null };
  }

  // CA-01: cria uma nova versão e atualiza o ponteiro atual — nunca sobrescreve
  // nem apaga system_prompt_versions existentes (histórico linear, item 1 do spec).
  async update(key: string, content: string, userId: string) {
    this.assertKnownKey(key);

    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.systemPrompt.findUnique({ where: { promptKey: key } });
      const nextVersion = (existing?.currentVersion ?? 0) + 1;

      await tx.systemPromptVersion.create({
        data: { promptKey: key, version: nextVersion, content, createdBy: userId },
      });

      const updated = await tx.systemPrompt.upsert({
        where: { promptKey: key },
        update: { content, currentVersion: nextVersion, updatedBy: userId },
        create: { promptKey: key, content, currentVersion: nextVersion, updatedBy: userId },
      });

      this.cache.set(key, content);
      return updated;
    });
  }

  // CA-02: histórico completo em ordem cronológica (mais antiga primeiro).
  async listVersions(key: string) {
    this.assertKnownKey(key);
    return this.prisma.systemPromptVersion.findMany({
      where: { promptKey: key },
      orderBy: { version: "asc" },
    });
  }

  // CA-03: rollback é uma NOVA versão com o conteúdo da antiga — preserva o
  // histórico linear em vez de "voltar o ponteiro", conforme item 2 do spec.
  async rollback(key: string, version: number, userId: string) {
    this.assertKnownKey(key);
    const target = await this.prisma.systemPromptVersion.findUnique({
      where: { promptKey_version: { promptKey: key, version } },
    });
    if (!target) throw new NotFoundException(`Versão ${version} não encontrada para "${key}".`);

    return this.update(key, target.content, userId);
  }
}

// Interpolação {{placeholder}} simples usada pelos prompts com variáveis
// dinâmicas (carousel, brand identity lock) — sem dependência de template engine.
export function interpolate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key: string) => vars[key] ?? match);
}
