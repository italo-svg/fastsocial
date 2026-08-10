import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { AnalyticsFilters } from "@/hooks/useAnalytics";

interface FilterBarProps {
  filters: AnalyticsFilters;
  onChange: (filters: AnalyticsFilters) => void;
  onExport: () => void;
  isExporting?: boolean;
}

export function FilterBar({ filters, onChange, onExport, isExporting }: FilterBarProps): JSX.Element {
  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="space-y-1">
        <label className="text-xs font-medium text-neutral-600">De</label>
        <Input
          type="date"
          value={filters.from}
          onChange={(e) => onChange({ ...filters, from: e.target.value })}
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-neutral-600">Até</label>
        <Input type="date" value={filters.to} onChange={(e) => onChange({ ...filters, to: e.target.value })} />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-neutral-600">Rede</label>
        <select
          value={filters.network ?? ""}
          onChange={(e) => onChange({ ...filters, network: e.target.value || undefined })}
          className="h-10 rounded-lg border border-neutral-200 bg-white px-3 text-sm text-neutral-900 outline-none"
        >
          <option value="">Todas</option>
          <option value="instagram">Instagram</option>
          <option value="facebook">Facebook</option>
          <option value="linkedin">LinkedIn</option>
        </select>
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-neutral-600">Formato</label>
        <select
          value={filters.format ?? ""}
          onChange={(e) => onChange({ ...filters, format: e.target.value || undefined })}
          className="h-10 rounded-lg border border-neutral-200 bg-white px-3 text-sm text-neutral-900 outline-none"
        >
          <option value="">Todos</option>
          <option value="static_post">Post estático</option>
          <option value="carousel">Carrossel</option>
        </select>
      </div>
      <Button variant="secondary" type="button" onClick={onExport} disabled={isExporting}>
        {isExporting ? "Exportando..." : "Exportar CSV"}
      </Button>
    </div>
  );
}
