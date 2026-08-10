import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PlatformAdminGuard } from "../common/guards/platform-admin.guard";
import { CurrentUser, CurrentUserPayload } from "../auth/current-user.decorator";
import { HelpCenterService } from "./help-center.service";
import { CreateHelpArticleDto, UpdateHelpArticleDto } from "./dto/help-article.dto";

@Controller()
export class HelpArticlesController {
  constructor(private readonly helpCenterService: HelpCenterService) {}

  // Público de propósito (spec 050) — central de ajuda é consultada antes do login.
  @Get("help-articles")
  listPublished(@Query("q") q?: string) {
    return this.helpCenterService.listPublishedArticles(q);
  }

  @Get("help-articles/:slug")
  getBySlug(@Param("slug") slug: string) {
    return this.helpCenterService.getPublishedArticleBySlug(slug);
  }

  // CA-03: só super_admin gerencia conteúdo — mesmo padrão de platform-admin/system-prompts.
  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @Get("platform/help-articles")
  listAll() {
    return this.helpCenterService.listAllArticles();
  }

  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @Post("platform/help-articles")
  create(@Body() dto: CreateHelpArticleDto, @CurrentUser() user: CurrentUserPayload) {
    return this.helpCenterService.createArticle(dto, user.id);
  }

  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @Put("platform/help-articles/:id")
  update(@Param("id") id: string, @Body() dto: UpdateHelpArticleDto) {
    return this.helpCenterService.updateArticle(id, dto);
  }

  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @Delete("platform/help-articles/:id")
  remove(@Param("id") id: string) {
    return this.helpCenterService.deleteArticle(id);
  }
}
