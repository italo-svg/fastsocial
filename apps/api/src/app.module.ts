import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
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

// Módulos de negócio (specs 012 em diante) serão importados aqui conforme forem criados.
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envValidationSchema,
      validationOptions: { abortEarly: false },
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
  ],
})
export class AppModule {}
