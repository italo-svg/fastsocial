import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../prisma/prisma.service";
import { StorageService } from "../common/services/storage.service";
import { CreateContentPieceDto } from "./dto/create-content-piece.dto";
import { UpdateContentPieceDto } from "./dto/update-content-piece.dto";
import { UpdateContentSlideDto } from "./dto/update-content-slide.dto";
import { RenderContentPieceDto } from "./dto/render-content-piece.dto";

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
    await this.assertOwnership(workspaceId, contentPieceId);
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
    await this.assertOwnership(workspaceId, contentPieceId);
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

  private async assertOwnership(workspaceId: string, contentPieceId: string): Promise<void> {
    const exists = await this.prisma.contentPiece.findFirst({ where: { id: contentPieceId, workspaceId } });
    if (!exists) throw new NotFoundException("Peça de conteúdo não encontrada.");
  }
}
