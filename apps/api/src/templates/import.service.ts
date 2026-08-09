import { execFile } from "node:child_process";
import { mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { BadRequestException, Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import sharp from "sharp";
import { PrismaService } from "../prisma/prisma.service";
import { StorageService } from "../common/services/storage.service";
import { ImportTemplateDto } from "./dto/import-template.dto";

const execFileAsync = promisify(execFile);

const TEMPLATES_BUCKET = "templates";
const MAX_SLIDES = 10;
const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;
const MIN_DIMENSION_PX = 1080;
const PDF_RENDER_DPI = "200";

@Injectable()
export class ImportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async import(workspaceId: string, files: Express.Multer.File[], dto: ImportTemplateDto) {
    if (!files || files.length === 0) {
      throw new BadRequestException("Nenhum arquivo enviado.");
    }
    for (const file of files) {
      if (file.size > MAX_FILE_SIZE_BYTES) {
        throw new BadRequestException(`Arquivo ${file.originalname} excede o limite de 20MB.`);
      }
    }

    const isSinglePdf = files.length === 1 && files[0]!.mimetype === "application/pdf";
    const areAllImages = files.every((f) => f.mimetype === "image/png" || f.mimetype === "image/jpeg");

    if (!isSinglePdf && !areAllImages) {
      throw new BadRequestException("Formato de arquivo não suportado — envie um PDF ou imagens PNG/JPG.");
    }

    // Criado antes da conversao porque o caminho de storage exige o id do template
    // (ver spec 013); placeholders sao substituidos apos o upload dos slides.
    const template = await this.prisma.templateAsset.create({
      data: {
        workspaceId,
        isSystemTemplate: false,
        source: dto.source,
        format: "static_post",
        slotMap: { zones: [], backgroundImages: [] },
      },
    });

    try {
      const slideUrls = isSinglePdf
        ? await this.importPdf(workspaceId, template.id, files[0]!)
        : await this.importImages(workspaceId, template.id, files);

      return await this.prisma.templateAsset.update({
        where: { id: template.id },
        data: {
          format: slideUrls.length > 1 ? "carousel" : "static_post",
          previewUrl: slideUrls[0],
          slotMap: { zones: [], backgroundImages: slideUrls } as unknown as Prisma.InputJsonValue,
        },
      });
    } catch (err) {
      await this.prisma.templateAsset.delete({ where: { id: template.id } }).catch(() => undefined);
      throw err;
    }
  }

  private async importPdf(
    workspaceId: string,
    templateId: string,
    file: Express.Multer.File,
  ): Promise<string[]> {
    const tmpDir = await mkdtemp(join(tmpdir(), "fastsocial-import-"));
    try {
      const pdfPath = join(tmpDir, "input.pdf");
      await writeFile(pdfPath, file.buffer);

      const { stdout: infoOut } = await execFileAsync("pdfinfo", [pdfPath]);
      const pagesMatch = infoOut.match(/Pages:\s+(\d+)/);
      const pageCount = pagesMatch ? parseInt(pagesMatch[1]!, 10) : 0;

      if (pageCount === 0) {
        throw new BadRequestException("Não foi possível ler o PDF enviado.");
      }
      if (pageCount > MAX_SLIDES) {
        throw new BadRequestException(
          `O PDF tem ${pageCount} páginas — o limite é ${MAX_SLIDES} (alinhado ao limite de carrossel do Instagram).`,
        );
      }

      await execFileAsync("pdftoppm", ["-png", "-r", PDF_RENDER_DPI, pdfPath, join(tmpDir, "slide")]);

      const slideFiles = (await readdir(tmpDir))
        .filter((f) => /^slide-\d+\.png$/.test(f))
        .sort((a, b) => parseInt(a.match(/\d+/)![0]!, 10) - parseInt(b.match(/\d+/)![0]!, 10));

      const urls: string[] = [];
      for (let i = 0; i < slideFiles.length; i++) {
        const buffer = await readFile(join(tmpDir, slideFiles[i]!));
        const path = `workspaces/${workspaceId}/templates/imported/${templateId}/slide-${i + 1}.png`;
        const { publicUrl } = await this.storage.upload(TEMPLATES_BUCKET, path, buffer, "image/png");
        urls.push(publicUrl);
      }
      return urls;
    } finally {
      await rm(tmpDir, { recursive: true, force: true });
    }
  }

  private async importImages(
    workspaceId: string,
    templateId: string,
    files: Express.Multer.File[],
  ): Promise<string[]> {
    if (files.length > MAX_SLIDES) {
      throw new BadRequestException(`Máximo de ${MAX_SLIDES} imagens por importação.`);
    }

    const urls: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i]!;
      const metadata = await sharp(file.buffer).metadata();
      const largerSide = Math.max(metadata.width ?? 0, metadata.height ?? 0);
      if (largerSide < MIN_DIMENSION_PX) {
        throw new BadRequestException(
          `Imagem ${file.originalname} tem resolução muito baixa (mínimo ${MIN_DIMENSION_PX}px no lado maior).`,
        );
      }
      const ext = file.mimetype === "image/png" ? "png" : "jpg";
      const path = `workspaces/${workspaceId}/templates/imported/${templateId}/slide-${i + 1}.${ext}`;
      const { publicUrl } = await this.storage.upload(TEMPLATES_BUCKET, path, file.buffer, file.mimetype);
      urls.push(publicUrl);
    }
    return urls;
  }
}
