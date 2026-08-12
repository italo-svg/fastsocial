import { Module } from "@nestjs/common";
import { APP_FILTER, APP_GUARD } from "@nestjs/core";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
import { ErrorTrackingService } from "./common/services/error-tracking.service";
import { ErrorTrackingFilter } from "./common/filters/error-tracking.filter";
import { ScheduleModule } from "@nestjs/schedule";
import { BullModule } from "@nestjs/bullmq";
import { envValidationSchema } from "./config/env.validation";
import { PrismaModule } from "./prisma/prisma.module";
import { HealthModule } from "./health/health.module";
import { AuthModule } from "./auth/auth.module";
import { WorkspacesModule } from "./workspaces/workspaces.module";
import { BrandKitModule } from "./brand-kit/brand-kit.module";
import { TemplatesModule } from "./templates/templates.module";
import { ImageSourcesModule } from "./image-sources/image-sources.module";
import { ImageGenerationModule } from "./image-generation/image-generation.module";
import { ContentPiecesModule } from "./content-pieces/content-pieces.module";
import { ResearchModule } from "./research/research.module";
import { CopyGenerationModule } from "./copy-generation/copy-generation.module";
import { SocialAccountsModule } from "./social-accounts/social-accounts.module";
import { PublicationsModule } from "./publications/publications.module";
import { AutopilotModule } from "./autopilot/autopilot.module";
import { AnalyticsModule } from "./analytics/analytics.module";
import { BillingModule } from "./billing/billing.module";
import { PlatformAdminModule } from "./platform-admin/platform-admin.module";
import { AuditModule } from "./audit/audit.module";
import { DataPrivacyModule } from "./data-privacy/data-privacy.module";
import { BullBoardModule } from "./queue/bull-board.module";
import { SystemHealthModule } from "./system-health/system-health.module";
import { FunnelModule } from "./funnel/funnel.module";
import { SystemPromptsModule } from "./system-prompts/system-prompts.module";
import { HelpCenterModule } from "./help-center/help-center.module";
import { SupportChatModule } from "./support-chat/support-chat.module";
import { AddonsModule } from "./addons/addons.module";
import { InstagramAutomationModule } from "./instagram-automation/instagram-automation.module";

// Módulos de negócio (specs 012 em diante) serão importados aqui conforme forem criados.
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envValidationSchema,
      validationOptions: { abortEarly: false },
    }),
    // Achado numa auditoria de prontidão de produção: só o FunnelModule tinha
    // rate limiting (escopado só a ele, CA-05 do spec 046) — o resto da API
    // inteira (signup-adjacent, criação de conteúdo, endpoints de IA que vão
    // custar dinheiro real assim que as chaves existirem) não tinha limite
    // nenhum. Limite global generoso (120 req/min por IP) via APP_GUARD —
    // não deve interferir com uso legítimo (várias chamadas paralelas de uma
    // tela só), mas barra abuso automatizado.
    //
    // Bug real encontrado ao validar este próprio fix: nomear esse throttler
    // "global" e deixar o FunnelModule com seu PRÓPRIO `ThrottlerModule.forRoot()`
    // separado ("default", 20/min) fazia o limite de 20/min vazar pra API
    // inteira (confirmado via `curl -I /health` mostrando `X-RateLimit-Limit: 20`
    // numa rota que nunca passa perto do FunnelModule) — o pacote registra as
    // opções do throttler de forma efetivamente global entre módulos, então o
    // último `forRoot()` carregado vencia pra todo mundo, não só pro funil.
    // Corrigido: UM único `forRoot()` aqui com o nome "default" (padrão que o
    // decorator `@Throttle()` espera), e o FunnelController agora usa
    // `@Throttle({ default: { limit: 20, ttl: 60_000 } })` pra sobrescrever
    // só as próprias rotas em vez de um `forRoot()` concorrente.
    ThrottlerModule.forRoot([{ name: "default", ttl: 60_000, limit: 120 }]),
    ScheduleModule.forRoot(),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: { url: config.get<string>("REDIS_URL") ?? "redis://fastsocial-redis:6379" },
      }),
    }),
    PrismaModule,
    HealthModule,
    AuthModule,
    WorkspacesModule,
    BrandKitModule,
    TemplatesModule,
    ImageSourcesModule,
    ImageGenerationModule,
    ContentPiecesModule,
    ResearchModule,
    CopyGenerationModule,
    SocialAccountsModule,
    PublicationsModule,
    AutopilotModule,
    AnalyticsModule,
    BillingModule,
    PlatformAdminModule,
    AuditModule,
    DataPrivacyModule,
    BullBoardModule,
    SystemHealthModule,
    FunnelModule,
    SystemPromptsModule,
    HelpCenterModule,
    SupportChatModule,
    AddonsModule,
    InstagramAutomationModule,
  ],
  providers: [
    ErrorTrackingService,
    { provide: APP_FILTER, useClass: ErrorTrackingFilter },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
