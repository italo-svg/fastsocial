"use client";

import { Button } from "@/components/ui/button";
import { useConnectFlow } from "@/hooks/useConnectFlow";

interface ConnectButtonProps {
  provider: "meta" | "linkedin";
  label: string;
  onDone: () => void;
}

export function ConnectButton({ provider, label, onDone }: ConnectButtonProps): JSX.Element {
  const { connect, state, errorMessage } = useConnectFlow(provider, onDone);

  return (
    <div className="flex flex-col gap-1">
      <Button type="button" onClick={() => void connect()} disabled={state === "connecting"}>
        {state === "connecting" ? "Conectando..." : label}
      </Button>
      {state === "timeout" && (
        <p className="text-xs text-danger">Tempo esgotado aguardando a conexão. Tente novamente.</p>
      )}
      {state === "error" && errorMessage && <p className="text-xs text-danger">{errorMessage}</p>}
    </div>
  );
}
