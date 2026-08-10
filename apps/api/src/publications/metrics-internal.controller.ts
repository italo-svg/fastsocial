import { Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { ServiceTokenGuard } from "../auth/guards/service-token.guard";
import { PublicationsService } from "./publications.service";
import { MetricsCollectorService } from "../analytics/metrics-collector.service";

// Consumido pelo workflow de coleta de métricas do n8n (spec 035, cron
// diário) — mesmo padrão de "espelho interno" guardado só por
// ServiceTokenGuard (spec 032/033/034/035). collect-metrics adicionado
// pelo spec 038 (completando este controller, conforme o próprio spec pede).
@UseGuards(ServiceTokenGuard)
@Controller("internal/publications")
export class MetricsInternalController {
  constructor(
    private readonly publicationsService: PublicationsService,
    private readonly metricsCollectorService: MetricsCollectorService,
  ) {}

  @Get("pending-metrics-collection")
  pendingMetricsCollection() {
    return this.publicationsService.pendingMetricsCollection();
  }

  @Post(":id/collect-metrics")
  collectMetrics(@Param("id") id: string) {
    return this.metricsCollectorService.collectForPublication(id);
  }
}
