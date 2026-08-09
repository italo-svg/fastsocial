import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const MAX_COMPETITORS = 5;

interface Step1Data {
  niche: string;
  competitors: string[];
}

interface Step1NicheProps {
  data: Step1Data;
  onChange: (data: Step1Data) => void;
  error?: string | null;
}

export function Step1Niche({ data, onChange, error }: Step1NicheProps): JSX.Element {
  function updateCompetitor(index: number, value: string): void {
    const competitors = [...data.competitors];
    competitors[index] = value;
    onChange({ ...data, competitors });
  }

  function addCompetitor(): void {
    if (data.competitors.length >= MAX_COMPETITORS) return;
    onChange({ ...data, competitors: [...data.competitors, ""] });
  }

  function removeCompetitor(index: number): void {
    onChange({ ...data, competitors: data.competitors.filter((_, i) => i !== index) });
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-neutral-900">Qual é o seu nicho?</h2>
        <p className="mt-1 text-sm text-neutral-600">
          Isso ajuda a IA a entender o contexto da sua marca ao gerar conteúdo.
        </p>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-neutral-900">Nicho</label>
        <Input
          placeholder="Ex: Moda fitness feminina"
          value={data.niche}
          onChange={(e) => onChange({ ...data, niche: e.target.value })}
        />
        {error && <p className="text-sm text-danger">{error}</p>}
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-neutral-900">Concorrentes (opcional, até 5)</label>
        <div className="space-y-2">
          {data.competitors.map((competitor, index) => (
            <div key={index} className="flex gap-2">
              <Input
                placeholder="@concorrente ou nome da marca"
                value={competitor}
                onChange={(e) => updateCompetitor(index, e.target.value)}
              />
              <Button variant="secondary" type="button" onClick={() => removeCompetitor(index)}>
                Remover
              </Button>
            </div>
          ))}
        </div>
        {data.competitors.length < MAX_COMPETITORS && (
          <Button variant="secondary" type="button" size="sm" onClick={addCompetitor}>
            + Adicionar concorrente
          </Button>
        )}
      </div>
    </div>
  );
}
