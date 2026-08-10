import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ServiceHealth } from "@/hooks/useSystemHealth";

const STATUS_LABEL: Record<ServiceHealth["status"], string> = {
  up: "Operacional",
  down: "Fora do ar",
  not_configured: "Não configurado",
};

const SERVICE_LABEL: Record<string, string> = {
  database: "Banco de Dados",
  redis: "Redis (filas)",
  postiz: "Postiz",
  n8n: "n8n",
  glitchtip: "GlitchTip",
  anthropic: "Anthropic (Claude)",
  fal: "fal.ai (imagens)",
  meta: "Meta Ads Library",
  linkedin: "LinkedIn",
  stripe: "Stripe",
};

export function StatusCard({ service }: { service: ServiceHealth }): JSX.Element {
  const variant = service.status === "up" ? "success" : service.status === "down" ? "danger" : "neutral";

  return (
    <Card className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">{SERVICE_LABEL[service.name] ?? service.name}</h3>
        <Badge variant={variant}>{STATUS_LABEL[service.status]}</Badge>
      </div>
      <p className="text-xs text-neutral-500">
        {service.status !== "not_configured" && `${service.latencyMs}ms · `}
        Verificado às {new Date(service.lastCheckedAt).toLocaleTimeString("pt-BR")}
      </p>
      {service.detail && service.status === "down" && (
        <p className="truncate text-xs text-danger" title={service.detail}>
          {service.detail}
        </p>
      )}
    </Card>
  );
}
