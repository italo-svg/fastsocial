import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface RejectModalProps {
  onConfirm: (reason: string) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export function RejectModal({ onConfirm, onCancel, isSubmitting }: RejectModalProps): JSX.Element {
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleConfirm(): void {
    if (!reason.trim()) {
      setError("Informe o motivo da rejeição.");
      return;
    }
    setError(null);
    onConfirm(reason.trim());
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-md space-y-4">
        <h2 className="text-lg font-semibold">Motivo da rejeição</h2>
        <textarea
          className="min-h-24 w-full rounded-lg border border-neutral-200 bg-white p-3 text-sm text-neutral-900 outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          placeholder="Por que esta peça está sendo rejeitada?"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
        {error && <p className="text-sm text-danger">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" type="button" onClick={onCancel} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button variant="destructive" type="button" onClick={handleConfirm} disabled={isSubmitting}>
            {isSubmitting ? "Rejeitando..." : "Confirmar rejeição"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
