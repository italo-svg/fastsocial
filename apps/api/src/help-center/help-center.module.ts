import { Module } from "@nestjs/common";
import { HelpArticlesController } from "./help-articles.controller";
import { ChangelogController } from "./changelog.controller";
import { HelpCenterService } from "./help-center.service";

@Module({
  controllers: [HelpArticlesController, ChangelogController],
  providers: [HelpCenterService],
  exports: [HelpCenterService],
})
export class HelpCenterModule {}
