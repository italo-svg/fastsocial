import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { SocialAccount } from "@/hooks/useSocialAccounts";

interface DisconnectConfirmModalProps {
  account: SocialAccount;
  onConfirm: () => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export function DisconnectConfirmModal({
  account,
  onConfirm,
  onCancel,
  isSubmitting,
}: DisconnectConfirmModalProps): JSX.Element {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-md space-y-4">
        <h2 className="text-lg font-semibold">Desconectar {account.displayName ?? account.externalAccountId}?</h2>
        <p className="text-sm text-neutral-600">
          Peças de conteúdo já agendadas para esta conta ficarão sem destino de publicação. Essa ação não pode ser
          desfeita por aqui — para reconectar, será preciso passar pelo fluxo de conexão novamente.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" type="button" onClick={onCancel} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button variant="destructive" type="button" onClick={onConfirm} disabled={isSubmitting}>
            {isSubmitting ? "Desconectando..." : "Desconectar"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
