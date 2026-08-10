import { Controller, Get, UseGuards } from "@nestjs/common";
import { ServiceTokenGuard } from "../auth/guards/service-token.guard";
import { PublicationsService } from "./publications.service";

// Consumido pelo workflow de coleta de métricas do n8n (spec 035, cron
// diário) — mesmo padrão de "espelho interno" guardado só por
// ServiceTokenGuard (spec 032/033/034/035).
@UseGuards(ServiceTokenGuard)
@Controller("internal/publications")
export class MetricsInternalController {
  constructor(private readonly publicationsService: PublicationsService) {}

  @Get("pending-metrics-collection")
  pendingMetricsCollection() {
    return this.publicationsService.pendingMetricsCollection();
  }
}
