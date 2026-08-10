import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { slugify } from "../workspaces/workspaces.service";
import { CreateHelpArticleDto, UpdateHelpArticleDto } from "./dto/help-article.dto";
import { CreateChangelogEntryDto, UpdateChangelogEntryDto } from "./dto/changelog-entry.dto";

@Injectable()
export class HelpCenterService {
  constructor(private readonly prisma: PrismaService) {}

  // CA-01: ILIKE simples em title/content_markdown — suficiente pro volume
  // inicial de artigos (item 1 do spec), sem motor de busca dedicado.
  async listPublishedArticles(q?: string) {
    return this.prisma.helpArticle.findMany({
      where: {
        isPublished: true,
        ...(q
          ? { OR: [{ title: { contains: q, mode: "insensitive" } }, { contentMarkdown: { contains: q, mode: "insensitive" } }] }
          : {}),
      },
      orderBy: { updatedAt: "desc" },
    });
  }

  // CA-02: artigo não publicado nunca aparece aqui, mesmo sabendo o slug exato.
  async getPublishedArticleBySlug(slug: string) {
    const article = await this.prisma.helpArticle.findFirst({ where: { slug, isPublished: true } });
    if (!article) throw new NotFoundException("Artigo não encontrado.");
    return article;
  }

  listAllArticles() {
    return this.prisma.helpArticle.findMany({ orderBy: { updatedAt: "desc" } });
  }

  // item 3 do spec: slug automático a partir do title, kebab-case, com
  // sufixo numérico em colisão — mesmo padrão do slug de workspace (spec 009).
  private async generateUniqueSlug(title: string): Promise<string> {
    const base = slugify(title) || "artigo";
    let slug = base;
    let suffix = 1;
    while (await this.prisma.helpArticle.findUnique({ where: { slug } })) {
      suffix += 1;
      slug = `${base}-${suffix}`;
    }
    return slug;
  }

  async createArticle(dto: CreateHelpArticleDto, userId: string) {
    const slug = await this.generateUniqueSlug(dto.title);
    return this.prisma.helpArticle.create({
      data: {
        slug,
        title: dto.title,
        category: dto.category,
        contentMarkdown: dto.contentMarkdown,
        isPublished: dto.isPublished ?? false,
        createdBy: userId,
      },
    });
  }

  async updateArticle(id: string, dto: UpdateHelpArticleDto) {
    await this.assertArticleExists(id);
    return this.prisma.helpArticle.update({ where: { id }, data: dto });
  }

  async deleteArticle(id: string): Promise<void> {
    await this.assertArticleExists(id);
    await this.prisma.helpArticle.delete({ where: { id } });
  }

  private async assertArticleExists(id: string): Promise<void> {
    const article = await this.prisma.helpArticle.findUnique({ where: { id } });
    if (!article) throw new NotFoundException("Artigo não encontrado.");
  }

  // CA-04: só published_at preenchido, mais recente primeiro.
  listPublishedChangelog() {
    return this.prisma.changelogEntry.findMany({
      where: { publishedAt: { not: null } },
      orderBy: { publishedAt: "desc" },
    });
  }

  listAllChangelog() {
    return this.prisma.changelogEntry.findMany({ orderBy: { createdAt: "desc" } });
  }

  createChangelogEntry(dto: CreateChangelogEntryDto, userId: string) {
    return this.prisma.changelogEntry.create({
      data: {
        title: dto.title,
        bodyMarkdown: dto.bodyMarkdown,
        tag: dto.tag,
        publishedAt: dto.publishedAt ? new Date(dto.publishedAt) : null,
        createdBy: userId,
      },
    });
  }

  async updateChangelogEntry(id: string, dto: UpdateChangelogEntryDto) {
    await this.assertChangelogExists(id);
    return this.prisma.changelogEntry.update({
      where: { id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.bodyMarkdown !== undefined ? { bodyMarkdown: dto.bodyMarkdown } : {}),
        ...(dto.tag !== undefined ? { tag: dto.tag } : {}),
        ...(dto.publishedAt !== undefined ? { publishedAt: dto.publishedAt ? new Date(dto.publishedAt) : null } : {}),
      },
    });
  }

  async deleteChangelogEntry(id: string): Promise<void> {
    await this.assertChangelogExists(id);
    await this.prisma.changelogEntry.delete({ where: { id } });
  }

  private async assertChangelogExists(id: string): Promise<void> {
    const entry = await this.prisma.changelogEntry.findUnique({ where: { id } });
    if (!entry) throw new NotFoundException("Entrada de changelog não encontrada.");
  }
}
