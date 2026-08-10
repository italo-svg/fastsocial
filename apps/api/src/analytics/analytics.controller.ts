import { Controller, Get, Query, Res, UseGuards } from "@nestjs/common";
import type { Response } from "express";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { WorkspaceGuard } from "../common/guards/workspace.guard";
import { CurrentWorkspace, CurrentWorkspacePayload } from "../common/decorators/current-workspace.decorator";
import { AnalyticsQueryService, type RankingMetric } from "./analytics-query.service";

const VALID_METRICS: RankingMetric[] = ["reach", "impressions", "likes", "comments", "shares", "saves"];
const CSV_COLUMNS = ["date", "reach", "impressions", "likes", "comments", "shares", "saves"] as const;

@UseGuards(JwtAuthGuard, WorkspaceGuard)
@Controller("analytics")
export class AnalyticsController {
  constructor(private readonly analyticsQueryService: AnalyticsQueryService) {}

  @Get("summary")
  summary(
    @CurrentWorkspace() workspace: CurrentWorkspacePayload,
    @Query("from") from?: string,
    @Query("to") to?: string,
    @Query("network") network?: string,
    @Query("format") format?: string,
  ) {
    return this.analyticsQueryService.summary(workspace.id, {
      from: from ? new Date(from) : new Date(0),
      to: to ? new Date(to) : new Date(),
      network,
      format,
    });
  }

  @Get("ranking")
  ranking(
    @CurrentWorkspace() workspace: CurrentWorkspacePayload,
    @Query("metric") metric?: string,
    @Query("limit") limit?: string,
    @Query("from") from?: string,
    @Query("to") to?: string,
    @Query("network") network?: string,
    @Query("format") format?: string,
  ) {
    const resolvedMetric: RankingMetric = VALID_METRICS.includes(metric as RankingMetric)
      ? (metric as RankingMetric)
      : "reach";
    const resolvedLimit = limit ? Math.min(parseInt(limit, 10) || 10, 50) : 10;
    return this.analyticsQueryService.ranking(workspace.id, resolvedMetric, resolvedLimit, {
      from: from ? new Date(from) : new Date(0),
      to: to ? new Date(to) : new Date(),
      network,
      format,
    });
  }

  @Get("export.csv")
  async exportCsv(
    @CurrentWorkspace() workspace: CurrentWorkspacePayload,
    @Res() res: Response,
    @Query("from") from?: string,
    @Query("to") to?: string,
    @Query("network") network?: string,
    @Query("format") format?: string,
  ): Promise<void> {
    const { timeSeries } = await this.analyticsQueryService.summary(workspace.id, {
      from: from ? new Date(from) : new Date(0),
      to: to ? new Date(to) : new Date(),
      network,
      format,
    });

    const rows = [
      CSV_COLUMNS.join(","),
      ...timeSeries.map((row) => CSV_COLUMNS.map((col) => row[col]).join(",")),
    ];

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", "attachment; filename=analytics.csv");
    res.send(rows.join("\n"));
  }
}
