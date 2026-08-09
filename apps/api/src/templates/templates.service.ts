import { Injectable, NotFoundException } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { CreateTemplateDto } from "./dto/create-template.dto";
import { UpdateTemplateDto } from "./dto/update-template.dto";

@Injectable()
export class TemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  listSystem(format?: string) {
    return this.prisma.templateAsset.findMany({
      where: { isSystemTemplate: true, deletedAt: null, ...(format ? { format } : {}) },
      orderBy: { createdAt: "asc" },
    });
  }

  listOwn(workspaceId: string, format?: string) {
    return this.prisma.templateAsset.findMany({
      where: {
        workspaceId,
        isSystemTemplate: false,
        deletedAt: null,
        ...(format ? { format } : {}),
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async getOne(workspaceId: string, id: string) {
    const template = await this.prisma.templateAsset.findFirst({
      where: {
        id,
        deletedAt: null,
        OR: [{ isSystemTemplate: true }, { workspaceId }],
      },
    });
    if (!template) throw new NotFoundException("Template não encontrado.");
    return template;
  }

  create(workspaceId: string, dto: CreateTemplateDto) {
    return this.prisma.templateAsset.create({
      data: {
        workspaceId,
        isSystemTemplate: false,
        source: dto.source ?? "upload",
        format: dto.format,
        previewUrl: dto.previewUrl,
        slotMap: dto.slotMap as unknown as Prisma.InputJsonValue,
      },
    });
  }

  // Só localiza templates PRÓPRIOS e não-sistema — usado por update/remove para que um
  // template de sistema ou de outro workspace resulte em 404 (nunca 403, ver CA-03).
  private async findOwnEditable(workspaceId: string, id: string) {
    const template = await this.prisma.templateAsset.findFirst({
      where: { id, workspaceId, isSystemTemplate: false, deletedAt: null },
    });
    if (!template) throw new NotFoundException("Template não encontrado.");
    return template;
  }

  async update(workspaceId: string, id: string, dto: UpdateTemplateDto) {
    await this.findOwnEditable(workspaceId, id);
    return this.prisma.templateAsset.update({
      where: { id },
      data: {
        ...(dto.format !== undefined ? { format: dto.format } : {}),
        ...(dto.previewUrl !== undefined ? { previewUrl: dto.previewUrl } : {}),
        ...(dto.slotMap !== undefined
          ? { slotMap: dto.slotMap as unknown as Prisma.InputJsonValue }
          : {}),
      },
    });
  }

  async remove(workspaceId: string, id: string) {
    await this.findOwnEditable(workspaceId, id);
    return this.prisma.templateAsset.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
