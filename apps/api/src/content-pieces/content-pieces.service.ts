import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../prisma/prisma.service";
import { StorageService } from "../common/services/storage.service";
import { CreateContentPieceDto } from "./dto/create-content-piece.dto";
import { UpdateContentPieceDto } from "./dto/update-content-piece.dto";
import { UpdateContentSlideDto } from "./dto/update-content-slide.dto";
import { RenderContentPieceDto } from "./dto/render-content-piece.dto";
import {
  assertValidTransition,
  InvalidTransitionError,
  isEditable,
  resolveSubmissionTarget,
  type ContentPieceStatus,
} from "./state-machine";

const CONTENT_BUCKET = "content-renders";
const DEFAULT_RENDER_ENGINE_URL = "http://fastsocial-render-engine:3334";

export interface RenderEngineResponse {
  slides: { order: number; imageUrl: string }[];
  documentUrl?: string;
}

@Injectable()
export class ContentPiecesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly config: ConfigService,
  ) {}

  async create(workspaceId: string, dto: CreateContentPieceDto) {
    const template = await this.prisma.templateAsset.findFirst({
      where: { id: dto.templateId, deletedAt: null, OR: [{ isSystemTemplate: true }, { workspaceId }] },
    });
    if (!template) throw new NotFoundException("Template não encontrado.");

    const zones = (template.slotMap as { zones?: { slideIndex?: number }[] } | null)?.zones ?? [];
    const slideCount = zones.length > 0 ? Math.max(...zones.map((z) => z.slideIndex ?? 0)) + 1 : 1;

    return this.prisma.contentPiece.create({
      data: {
        workspaceId,
        templateId: dto.templateId,
        format: dto.format,
        origin: "manual",
        copyText: dto.briefing,
        insightId: dto.insightId,
        slides: { create: Array.from({ length: slideCount }, (_, i) => ({ slideOrder: i })) },
      },
      include: { slides: { orderBy: { slideOrder: "asc" } }, template: true },
    });
  }

  async get(workspaceId: string, id: string) {
    const piece = await this.prisma.contentPiece.findFirst({
      where: { id, workspaceId },
      include: { slides: { orderBy: { slideOrder: "asc" } }, template: true },
    });
    if (!piece) throw new NotFoundException("Peça de conteúdo não encontrada.");
    return piece;
  }

  list(workspaceId: string, status?: string) {
    return this.prisma.contentPiece.findMany({
      where: { workspaceId, ...(status ? { status } : {}) },
      include: { slides: { orderBy: { slideOrder: "asc" } } },
      orderBy: { updatedAt: "desc" },
    });
  }

  // Regra de seguranca do PRD 7.7 (a mais critica do spec 025): qualquer slide
  // image_source='ai_generated' NUNCA pula aprovacao humana, mesmo com
  // autoApprove=true vindo do autopilot — resolveSubmissionTarget e' o unico lugar
  // que decide isso, ver state-machine.ts.
  async submitForApproval(workspaceId: string, id: string, autoApprove: boolean) {
    const piece = await this.prisma.contentPiece.findFirst({
      where: { id, workspaceId },
      include: { slides: true },
    });
    if (!piece) throw new NotFoundException("Peça de conteúdo não encontrada.");

    const hasAiGeneratedSlide = piece.slides.some((s) => s.imageSource === "ai_generated");
    const targetStatus = resolveSubmissionTarget({ hasAiGeneratedSlide, autoApprove });

    try {
      assertValidTransition(piece.status as ContentPieceStatus, targetStatus);
    } catch (err) {
      if (err instanceof InvalidTransitionError) throw new ConflictException(err.message);
      throw err;
    }

    return this.prisma.contentPiece.update({
      where: { id },
      data: { status: targetStatus },
    });
  }

  async approve(workspaceId: string, id: string) {
    return this.transitionTo(workspaceId, id, "approved");
  }

  async reject(workspaceId: string, id: string, reason: string) {
    await this.transitionTo(workspaceId, id, "rejected");
    return this.prisma.contentPiece.update({
      where: { id },
      data: { rejectionReason: reason },
    });
  }

  private async transitionTo(workspaceId: string, id: string, targetStatus: ContentPieceStatus) {
    const piece = await this.prisma.contentPiece.findFirst({ where: { id, workspaceId } });
    if (!piece) throw new NotFoundException("Peça de conteúdo não encontrada.");

    try {
      assertValidTransition(piece.status as ContentPieceStatus, targetStatus);
    } catch (err) {
      if (err instanceof InvalidTransitionError) throw new ConflictException(err.message);
      throw err;
    }

    return this.prisma.contentPiece.update({ where: { id }, data: { status: targetStatus } });
  }

  // Troca o template de uma peca ja criada SEM recriar os slides existentes — so'
  // adiciona slides a mais se o novo template exigir mais (nunca remove), para
  // preservar imagens/copy ja definidos (CA-04, spec 019: trocar template mantem
  // imagem de IA ja aprovada, so' o layout muda).
  async updateTemplate(workspaceId: string, id: string, dto: UpdateContentPieceDto) {
    const piece = await this.prisma.contentPiece.findFirst({
      where: { id, workspaceId },
      include: { slides: true },
    });
    if (!piece) throw new NotFoundException("Peça de conteúdo não encontrada.");
    this.assertEditable(piece.status);

    const template = await this.prisma.templateAsset.findFirst({
      where: { id: dto.templateId, deletedAt: null, OR: [{ isSystemTemplate: true }, { workspaceId }] },
    });
    if (!template) throw new NotFoundException("Template não encontrado.");

    const zones = (template.slotMap as { zones?: { slideIndex?: number }[] } | null)?.zones ?? [];
    const slideCount = zones.length > 0 ? Math.max(...zones.map((z) => z.slideIndex ?? 0)) + 1 : 1;

    if (slideCount > piece.slides.length) {
      await this.prisma.contentSlide.createMany({
        data: Array.from({ length: slideCount - piece.slides.length }, (_, i) => ({
          contentPieceId: id,
          slideOrder: piece.slides.length + i,
        })),
      });
    }

    return this.prisma.contentPiece.update({
      where: { id },
      data: { templateId: dto.templateId, format: template.format },
      include: { slides: { orderBy: { slideOrder: "asc" } }, template: true },
    });
  }

  async updateSlide(workspaceId: string, contentPieceId: string, slideId: string, dto: UpdateContentSlideDto) {
    const piece = await this.assertOwnership(workspaceId, contentPieceId);
    this.assertEditable(piece.status);
    const slide = await this.prisma.contentSlide.findFirst({ where: { id: slideId, contentPieceId } });
    if (!slide) throw new NotFoundException("Slide não encontrado.");

    return this.prisma.contentSlide.update({
      where: { id: slideId },
      data: {
        ...(dto.slideText !== undefined ? { slideText: dto.slideText } : {}),
        ...(dto.imageSource !== undefined ? { imageSource: dto.imageSource } : {}),
        ...(dto.backgroundImageUrl !== undefined ? { backgroundImageUrl: dto.backgroundImageUrl } : {}),
      },
    });
  }

  async uploadSlideImage(
    workspaceId: string,
    contentPieceId: string,
    slideId: string,
    file: Express.Multer.File,
  ) {
    const piece = await this.assertOwnership(workspaceId, contentPieceId);
    this.assertEditable(piece.status);
    const slide = await this.prisma.contentSlide.findFirst({ where: { id: slideId, contentPieceId } });
    if (!slide) throw new NotFoundException("Slide não encontrado.");

    const ext = file.mimetype === "image/png" ? "png" : "jpg";
    const path = `workspaces/${workspaceId}/content/${contentPieceId}/uploads/slide-${slide.slideOrder}.${ext}`;
    const { publicUrl } = await this.storage.upload(CONTENT_BUCKET, path, file.buffer, file.mimetype);

    return this.prisma.contentSlide.update({
      where: { id: slideId },
      data: { backgroundImageUrl: publicUrl, imageSource: "own_library" },
    });
  }

  async render(workspaceId: string, contentPieceId: string, dto: RenderContentPieceDto) {
    const piece = await this.prisma.contentPiece.findFirst({
      where: { id: contentPieceId, workspaceId },
      include: {
        slides: { orderBy: { slideOrder: "asc" } },
        template: true,
        workspace: { include: { brandKit: true } },
      },
    });
    if (!piece) throw new NotFoundException("Peça de conteúdo não encontrada.");
    if (!piece.template) throw new BadRequestException("Peça sem template associado.");

    const missingImages = piece.slides.filter((s) => !s.backgroundImageUrl);
    if (missingImages.length > 0) {
      throw new BadRequestException(
        `Slide(s) sem imagem de fundo definida: ${missingImages.map((s) => s.slideOrder + 1).join(", ")}.`,
      );
    }

    const brandKit = piece.workspace.brandKit;
    const renderEngineUrl = this.config.get<string>("RENDER_ENGINE_URL") ?? DEFAULT_RENDER_ENGINE_URL;

    const payload = {
      workspaceId,
      contentPieceId,
      slotMap: piece.template.slotMap,
      brandKit: {
        colorPalette: (brandKit?.colorPalette as Record<string, string>) ?? {},
        typography: (brandKit?.typography as { fontFamily?: string }) ?? {},
        logoUrl: brandKit?.logoUrl ?? null,
      },
      copyPerSlide: piece.slides.map((s) => s.slideText ?? ""),
      backgroundImageUrls: piece.slides.map((s) => s.backgroundImageUrl as string),
      targetNetwork: dto.targetNetwork,
      targetFormat: piece.format,
    };

    const res = await fetch(`${renderEngineUrl}/render`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      throw new BadRequestException(`Falha ao renderizar: ${res.status} ${await res.text()}`);
    }

    const result = (await res.json()) as RenderEngineResponse;

    for (const slideResult of result.slides) {
      const slide = piece.slides[slideResult.order - 1];
      if (slide) {
        await this.prisma.contentSlide.update({
          where: { id: slide.id },
          data: { renderedImageUrl: slideResult.imageUrl },
        });
      }
    }

    if (result.documentUrl) {
      await this.prisma.contentPiece.update({
        where: { id: contentPieceId },
        data: { documentUrl: result.documentUrl },
      });
    }

    return result;
  }

  private async assertOwnership(workspaceId: string, contentPieceId: string) {
    const piece = await this.prisma.contentPiece.findFirst({ where: { id: contentPieceId, workspaceId } });
    if (!piece) throw new NotFoundException("Peça de conteúdo não encontrada.");
    return piece;
  }

  // CA-06: editar copy/template/fonte de imagem so' e' permitido em draft/rejected —
  // uma peca ja pending_approval/approved/scheduled/published nao pode ser alterada
  // por baixo do fluxo de aprovacao/agendamento.
  private assertEditable(status: string): void {
    if (!isEditable(status as ContentPieceStatus)) {
      throw new ConflictException(`Não é possível editar uma peça no status "${status}".`);
    }
  }
}
