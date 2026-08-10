import { Button } from "@/components/ui/button";

const MAX_TIMES = 6;

interface PreferredTimesInputProps {
  value: string[];
  onChange: (value: string[]) => void;
}

export function PreferredTimesInput({ value, onChange }: PreferredTimesInputProps): JSX.Element {
  function updateTime(index: number, time: string): void {
    const next = [...value];
    next[index] = time;
    onChange(next);
  }

  function addTime(): void {
    if (value.length >= MAX_TIMES) return;
    onChange([...value, "12:00"]);
  }

  function removeTime(index: number): void {
    onChange(value.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium">Horários preferenciais</label>
      <div className="space-y-2">
        {value.map((time, index) => (
          <div key={index} className="flex items-center gap-2">
            <input
              type="time"
              value={time}
              onChange={(e) => updateTime(index, e.target.value)}
              className="h-10 rounded-lg border border-neutral-200 bg-white px-3 text-sm text-neutral-900 outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
            <Button variant="secondary" size="sm" type="button" onClick={() => removeTime(index)}>
              Remover
            </Button>
          </div>
        ))}
      </div>
      {value.length < MAX_TIMES && (
        <Button variant="secondary" size="sm" type="button" onClick={addTime}>
          + Adicionar horário
        </Button>
      )}
    </div>
  );
}
