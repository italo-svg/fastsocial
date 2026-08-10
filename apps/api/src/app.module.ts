import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
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

// Módulos de negócio (specs 012 em diante) serão importados aqui conforme forem criados.
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envValidationSchema,
      validationOptions: { abortEarly: false },
    }),
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
  ],
})
export class AppModule {}
