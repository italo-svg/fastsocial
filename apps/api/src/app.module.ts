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
  ],
})
export class AppModule {}
