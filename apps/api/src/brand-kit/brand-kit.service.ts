import { randomUUID } from "crypto";
import { BadRequestException, Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { StorageService } from "../common/services/storage.service";
import { AuditLogService } from "../common/services/audit-log.service";
import { UpdateBrandKitDto } from "./dto/update-brand-kit.dto";

const BRAND_ASSETS_BUCKET = "brand-assets";
const MAX_REFERENCE_IMAGES = 8;
const MAX_LOGO_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_LOGO_TYPES = ["image/png", "image/svg+xml", "image/jpeg"];

export interface BrandKitResponse {
  workspaceId: string;
  niche: string | null;
  competitors: unknown;
  toneOfVoice: string | null;
  colorPalette: unknown;
  typography: unknown;
  logoUrl: string | null;
  defaultImageSource: string;
  referenceImages: string[];
  warnings: string[];
}

@Injectable()
export class BrandKitService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly auditLog: AuditLogService,
  ) {}

  async get(workspaceId: string): Promise<BrandKitResponse | null> {
    const kit = await this.prisma.brandKit.findUnique({ where: { workspaceId } });
    if (!kit) return null;
    return this.toResponse(kit);
  }

  async upsert(workspaceId: string, dto: UpdateBrandKitDto, userId?: string): Promise<BrandKitResponse> {
    const existing = await this.prisma.brandKit.findUnique({ where: { workspaceId } });

    const kit = await this.prisma.brandKit.upsert({
      where: { workspaceId },
      update: {
        ...(dto.niche !== undefined ? { niche: dto.niche } : {}),
        ...(dto.competitors !== undefined ? { competitors: dto.competitors as Prisma.InputJsonValue } : {}),
        ...(dto.toneOfVoice !== undefined ? { toneOfVoice: dto.toneOfVoice } : {}),
        ...(dto.colorPalette !== undefined ? { colorPalette: dto.colorPalette as Prisma.InputJsonValue } : {}),
        ...(dto.typography !== undefined ? { typography: dto.typography as Prisma.InputJsonValue } : {}),
        ...(dto.defaultImageSource !== undefined ? { defaultImageSource: dto.defaultImageSource } : {}),
      },
      create: {
        workspaceId,
        niche: dto.niche,
        competitors: (dto.competitors ?? []) as Prisma.InputJsonValue,
        toneOfVoice: dto.toneOfVoice,
        colorPalette: (dto.colorPalette ?? {}) as Prisma.InputJsonValue,
        typography: (dto.typography ?? {}) as Prisma.InputJsonValue,
        defaultImageSource: dto.defaultImageSource ?? "own_library",
      },
    });

    const response = this.toResponse(kit);

    const finalImageSource = dto.defaultImageSource ?? existing?.defaultImageSource;
    if (finalImageSource === "ai_generated" && response.referenceImages.length < 3) {
      response.warnings.push(
        "Recomendamos ao menos 3 imagens de referência para melhor fidelidade de marca na geração por IA.",
      );
    }

    // CA-01 (spec 042): alteração de brand kit auditada.
    await this.auditLog.record({
      workspaceId,
      userId,
      action: existing ? "brand_kit_updated" : "brand_kit_created",
      entityType: "brand_kit",
      entityId: kit.id,
      metadata: { fields: Object.keys(dto) },
    });

    return response;
  }

  async uploadLogo(workspaceId: string, file: Express.Multer.File): Promise<BrandKitResponse> {
    if (file.size > MAX_LOGO_SIZE_BYTES) {
      throw new BadRequestException("Logo excede o tamanho máximo de 5MB.");
    }
    if (!ALLOWED_LOGO_TYPES.includes(file.mimetype)) {
      throw new BadRequestException("Formato de logo inválido — use PNG, SVG ou JPG.");
    }

    const ext = file.mimetype === "image/svg+xml" ? "svg" : file.mimetype === "image/png" ? "png" : "jpg";
    const path = `workspaces/${workspaceId}/brand/logo.${ext}`;
    const { publicUrl } = await this.storage.upload(BRAND_ASSETS_BUCKET, path, file.buffer, file.mimetype);

    await this.prisma.brandKit.upsert({
      where: { workspaceId },
      update: { logoUrl: publicUrl },
      create: { workspaceId, logoUrl: publicUrl, defaultImageSource: "own_library" },
    });

    return (await this.get(workspaceId))!;
  }

  async uploadReferenceImages(
    workspaceId: string,
    files: Express.Multer.File[],
  ): Promise<BrandKitResponse> {
    const kit = await this.prisma.brandKit.findUnique({ where: { workspaceId } });
    const current = (kit?.referenceImages as string[] | undefined) ?? [];

    if (current.length + files.length > MAX_REFERENCE_IMAGES) {
      throw new BadRequestException(`Limite de ${MAX_REFERENCE_IMAGES} imagens de referência excedido.`);
    }

    const newUrls: string[] = [];
    for (const file of files) {
      const ext = file.mimetype.split("/")[1] ?? "jpg";
      const path = `workspaces/${workspaceId}/brand/references/${randomUUID()}.${ext}`;
      const { publicUrl } = await this.storage.upload(BRAND_ASSETS_BUCKET, path, file.buffer, file.mimetype);
      newUrls.push(publicUrl);
    }

    const updated = [...current, ...newUrls];
    await this.prisma.brandKit.upsert({
      where: { workspaceId },
      update: { referenceImages: updated as Prisma.InputJsonValue },
      create: {
        workspaceId,
        referenceImages: updated as Prisma.InputJsonValue,
        defaultImageSource: "own_library",
      },
    });

    return (await this.get(workspaceId))!;
  }

  async deleteReferenceImage(workspaceId: string, index: number): Promise<BrandKitResponse> {
    const kit = await this.prisma.brandKit.findUnique({ where: { workspaceId } });
    const current = (kit?.referenceImages as string[] | undefined) ?? [];

    if (index < 0 || index >= current.length) {
      throw new BadRequestException("Índice de imagem inválido.");
    }

    const updated = current.filter((_, i) => i !== index);
    await this.prisma.brandKit.update({
      where: { workspaceId },
      data: { referenceImages: updated as Prisma.InputJsonValue },
    });

    return (await this.get(workspaceId))!;
  }

  private toResponse(kit: {
    workspaceId: string;
    niche: string | null;
    competitors: unknown;
    toneOfVoice: string | null;
    colorPalette: unknown;
    typography: unknown;
    logoUrl: string | null;
    defaultImageSource: string;
    referenceImages: unknown;
  }): BrandKitResponse {
    return {
      workspaceId: kit.workspaceId,
      niche: kit.niche,
      competitors: kit.competitors,
      toneOfVoice: kit.toneOfVoice,
      colorPalette: kit.colorPalette,
      typography: kit.typography,
      logoUrl: kit.logoUrl,
      defaultImageSource: kit.defaultImageSource,
      referenceImages: (kit.referenceImages as string[] | undefined) ?? [],
      warnings: [],
    };
  }
}
