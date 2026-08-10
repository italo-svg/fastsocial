import { Module } from "@nestjs/common";
import { ResearchController } from "./research.controller";
import { ResearchService } from "./research.service";
import { InsightSummarizerService } from "./insight-summarizer.service";
import { AnthropicService } from "../common/services/anthropic.service";
import { MetaAdsLibrarySource } from "./sources/meta-ads-library.source";
import { CompetitorScrapingSource } from "./sources/competitor-scraping.source";
import { HashtagTrendSource } from "./sources/hashtag-trend.source";

@Module({
  controllers: [ResearchController],
  providers: [
    ResearchService,
    InsightSummarizerService,
    AnthropicService,
    MetaAdsLibrarySource,
    CompetitorScrapingSource,
    HashtagTrendSource,
  ],
  exports: [ResearchService],
})
export class ResearchModule {}
