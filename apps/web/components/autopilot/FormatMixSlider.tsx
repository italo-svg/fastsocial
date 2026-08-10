interface FormatMixSliderProps {
  staticPostRatio: number; // 0-1, carousel é sempre o complemento (1 - staticPostRatio)
  onChange: (staticPostRatio: number) => void;
}

// CA-03: um único slider controla o par estático/carrossel — mover um lado
// sempre ajusta o outro automaticamente, então a soma nunca pode ser
// diferente de 100% (não existem dois estados independentes para divergir).
export function FormatMixSlider({ staticPostRatio, onChange }: FormatMixSliderProps): JSX.Element {
  const staticPct = Math.round(staticPostRatio * 100);
  const carouselPct = 100 - staticPct;

  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium">Mix de formatos</label>
      <input
        type="range"
        min={0}
        max={100}
        value={staticPct}
        onChange={(e) => onChange(Number(e.target.value) / 100)}
        className="h-2 w-full accent-primary"
      />
      <div className="flex justify-between text-sm text-neutral-600">
        <span>Post estático: {staticPct}%</span>
        <span>Carrossel: {carouselPct}%</span>
      </div>
    </div>
  );
}
