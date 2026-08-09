import { BadRequestException, Controller, Get, Query, Res, UseGuards } from "@nestjs/common";
import type { Response } from "express";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { WorkspaceGuard } from "../common/guards/workspace.guard";
import { StockImagesService } from "./stock-images.service";
import type { ImageOrientation } from "./adapters/stock-image-adapter.interface";

const VALID_ORIENTATIONS: ImageOrientation[] = ["square", "portrait", "landscape"];

@Controller("image-sources")
export class StockImagesController {
  constructor(private readonly stockImagesService: StockImagesService) {}

  // Sem X-Workspace-Id de proposito: e' um status global do provider, nao depende
  // de qual workspace esta ativo (ver spec 016, comando de validacao).
  @UseGuards(JwtAuthGuard)
  @Get("status")
  getStatus() {
    return this.stockImagesService.getStatus();
  }

  @UseGuards(JwtAuthGuard, WorkspaceGuard)
  @Get("stock")
  async search(
    @Query("query") query: string,
    @Query("orientation") orientation: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ) {
    if (!query || !query.trim()) {
      throw new BadRequestException("Parâmetro 'query' é obrigatório.");
    }

    const validOrientation = VALID_ORIENTATIONS.includes(orientation as ImageOrientation)
      ? (orientation as ImageOrientation)
      : undefined;

    const { results, cacheHit } = await this.stockImagesService.search(query, validOrientation);
    res.setHeader("X-Cache", cacheHit ? "HIT" : "MISS");
    return results;
  }
}
