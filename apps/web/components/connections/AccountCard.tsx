import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useConnectFlow } from "@/hooks/useConnectFlow";
import type { SocialAccount } from "@/hooks/useSocialAccounts";

const NETWORK_LABELS: Record<string, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  linkedin: "LinkedIn",
};

const STATUS_BADGE: Record<string, { label: string; variant: "success" | "warning" | "danger" | "neutral" }> = {
  connected: { label: "Conectado", variant: "success" },
  expired: { label: "Token expirado", variant: "danger" },
  error: { label: "Erro", variant: "danger" },
  revoked: { label: "Revogado", variant: "danger" },
};

interface AccountCardProps {
  account: SocialAccount;
  onReconnected: () => void;
  onDisconnect: () => void;
  isDisconnecting?: boolean;
}

export function AccountCard({ account, onReconnected, onDisconnect, isDisconnecting }: AccountCardProps): JSX.Element {
  const statusInfo = STATUS_BADGE[account.status] ?? { label: account.status, variant: "neutral" as const };
  const needsReconnect = account.status === "expired" || account.status === "revoked" || account.status === "error";

  // "Reconectar" repete o MESMO fluxo de OAuth do botão "Conectar" (CA-03),
  // não é um refetch — instagram/facebook usam o provider "meta" no backend.
  const provider = account.network === "linkedin" ? "linkedin" : "meta";
  const { connect, state, errorMessage } = useConnectFlow(provider, onReconnected);

  return (
    <Card className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <p className="truncate font-medium">{account.displayName ?? account.externalAccountId}</p>
          <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
        </div>
        <p className="mt-1 text-sm text-neutral-600">{NETWORK_LABELS[account.network] ?? account.network}</p>
        {state === "timeout" && (
          <p className="mt-1 text-xs text-danger">Tempo esgotado aguardando a reconexão. Tente novamente.</p>
        )}
        {state === "error" && errorMessage && <p className="mt-1 text-xs text-danger">{errorMessage}</p>}
      </div>
      <div className="flex shrink-0 gap-2">
        {needsReconnect && (
          <Button type="button" size="sm" onClick={() => void connect()} disabled={state === "connecting"}>
            {state === "connecting" ? "Conectando..." : "Reconectar"}
          </Button>
        )}
        <Button type="button" size="sm" variant="destructive" onClick={onDisconnect} disabled={isDisconnecting}>
          {isDisconnecting ? "Desconectando..." : "Desconectar"}
        </Button>
      </div>
    </Card>
  );
}
