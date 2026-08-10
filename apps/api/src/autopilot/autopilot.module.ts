import { Module } from "@nestjs/common";
import { AutopilotInternalController } from "./autopilot-internal.controller";
import { AutopilotInternalService } from "./autopilot-internal.service";
import { AuthModule } from "../auth/auth.module";
import { ResearchModule } from "../research/research.module";
import { CopyGenerationModule } from "../copy-generation/copy-generation.module";
import { ContentPiecesModule } from "../content-pieces/content-pieces.module";
import { ImageGenerationModule } from "../image-generation/image-generation.module";
import { TemplatesModule } from "../templates/templates.module";
import { ImageSourcesModule } from "../image-sources/image-sources.module";

@Module({
  imports: [
    AuthModule,
    ResearchModule,
    CopyGenerationModule,
    ContentPiecesModule,
    ImageGenerationModule,
    TemplatesModule,
    ImageSourcesModule,
  ],
  controllers: [AutopilotInternalController],
  providers: [AutopilotInternalService],
})
export class AutopilotModule {}
