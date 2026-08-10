"use client";

import { useState } from "react";
import { AccountCard } from "@/components/connections/AccountCard";
import { ConnectButton } from "@/components/connections/ConnectButton";
import { DisconnectConfirmModal } from "@/components/connections/DisconnectConfirmModal";
import { useDisconnectSocialAccount, useSocialAccounts, type SocialAccount } from "@/hooks/useSocialAccounts";

export default function ConnectionsPage(): JSX.Element {
  const { data: accounts, isLoading, refetch } = useSocialAccounts();
  const disconnectMutation = useDisconnectSocialAccount();
  const [pendingDisconnect, setPendingDisconnect] = useState<SocialAccount | null>(null);

  function handleConfirmDisconnect(): void {
    if (!pendingDisconnect) return;
    disconnectMutation.mutate(pendingDisconnect.id, {
      onSuccess: () => setPendingDisconnect(null),
    });
  }

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      <div>
        <h1 className="text-xl font-semibold">Conexões</h1>
        <p className="mt-1 text-sm text-neutral-600">
          Contas conectadas para publicação de conteúdo. O FastSocial cuida da infraestrutura por trás — você só
          gerencia as contas aqui.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <ConnectButton provider="meta" label="Conectar Instagram/Facebook" onDone={() => void refetch()} />
        <ConnectButton provider="linkedin" label="Conectar LinkedIn" onDone={() => void refetch()} />
      </div>

      {isLoading && <p className="text-sm text-neutral-600">Carregando...</p>}

      {!isLoading && (accounts ?? []).length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-neutral-200 p-10 text-center">
          <p className="text-sm font-medium">Nenhuma conta conectada ainda.</p>
        </div>
      )}

      <div className="space-y-3">
        {(accounts ?? []).map((account) => (
          <AccountCard
            key={account.id}
            account={account}
            onReconnected={() => void refetch()}
            onDisconnect={() => setPendingDisconnect(account)}
            isDisconnecting={disconnectMutation.isPending && disconnectMutation.variables === account.id}
          />
        ))}
      </div>

      {pendingDisconnect && (
        <DisconnectConfirmModal
          account={pendingDisconnect}
          onConfirm={handleConfirmDisconnect}
          onCancel={() => setPendingDisconnect(null)}
          isSubmitting={disconnectMutation.isPending}
        />
      )}
    </main>
  );
}
