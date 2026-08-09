interface BriefingPanelProps {
  value: string;
  onChange: (value: string) => void;
}

// TODO(spec 022): quando o endpoint de geracao de copy existir, adicionar um
// botao "Gerar copy" aqui que usa este briefing como entrada e preenche o texto
// de cada slide automaticamente via IA. Ate' la', o usuario escreve o copy
// diretamente no campo de cada slide (ver ContentEditorPage).
export function BriefingPanel({ value, onChange }: BriefingPanelProps): JSX.Element {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium">Do que é o post?</label>
      <textarea
        className="min-h-20 w-full rounded-lg border border-neutral-200 bg-white p-3 text-sm text-neutral-900 outline-none focus:border-primary focus:ring-1 focus:ring-primary"
        placeholder="Ex: lançamento da nova coleção de moda fitness, tom animado"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
