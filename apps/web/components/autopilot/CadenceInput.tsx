const MIN_POSTS_PER_WEEK = 1;
const MAX_POSTS_PER_WEEK = 21;

interface CadenceInputProps {
  value: number;
  onChange: (value: number) => void;
}

export function CadenceInput({ value, onChange }: CadenceInputProps): JSX.Element {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium">Posts por semana</label>
      <div className="flex items-center gap-3">
        <input
          type="range"
          min={MIN_POSTS_PER_WEEK}
          max={MAX_POSTS_PER_WEEK}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="h-2 w-full accent-primary"
        />
        <span className="w-10 shrink-0 text-right text-sm font-semibold">{value}</span>
      </div>
    </div>
  );
}
