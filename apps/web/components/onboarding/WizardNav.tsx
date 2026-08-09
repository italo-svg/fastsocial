import { Button } from "@/components/ui/button";

interface WizardNavProps {
  step: number;
  totalSteps: number;
  onBack: () => void;
  onNext: () => void;
  loading?: boolean;
}

export function WizardNav({ step, totalSteps, onBack, onNext, loading }: WizardNavProps): JSX.Element {
  const isLast = step === totalSteps;
  return (
    <div className="flex items-center justify-between pt-2">
      <Button variant="secondary" onClick={onBack} disabled={step === 1 || loading} type="button">
        Voltar
      </Button>
      <Button onClick={onNext} disabled={loading} type="button">
        {loading ? "Salvando..." : isLast ? "Concluir" : "Próximo"}
      </Button>
    </div>
  );
}
