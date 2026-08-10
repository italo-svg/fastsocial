"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";

export interface SocialAccount {
  id: string;
  network: string;
  externalAccountId: string;
  displayName: string | null;
  status: "connected" | "expired" | "disconnected" | "cancelled" | string;
  connectedAt: string;
}

const SOCIAL_ACCOUNTS_KEY = ["social-accounts"];

export function useSocialAccounts() {
  return useQuery({
    queryKey: SOCIAL_ACCOUNTS_KEY,
    queryFn: () => apiFetch<SocialAccount[]>("/social-accounts"),
    // DELETE /social-accounts/:id não apaga a linha (fica status='disconnected'
    // para histórico/auditoria) — a UI trata "desconectada" como removida da
    // lista (CA-04), então filtramos aqui em vez de esperar isso do backend.
    select: (accounts) => accounts.filter((a) => a.status !== "disconnected"),
  });
}

export function useSyncSocialAccounts() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiFetch("/social-accounts/sync", { method: "POST" }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: SOCIAL_ACCOUNTS_KEY }),
  });
}

export function useDisconnectSocialAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch(`/social-accounts/${id}`, { method: "DELETE" }),
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: SOCIAL_ACCOUNTS_KEY });
      const previous = queryClient.getQueryData<SocialAccount[]>(SOCIAL_ACCOUNTS_KEY);
      queryClient.setQueryData<SocialAccount[]>(SOCIAL_ACCOUNTS_KEY, (old) =>
        (old ?? []).filter((a) => a.id !== id),
      );
      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) queryClient.setQueryData(SOCIAL_ACCOUNTS_KEY, context.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: SOCIAL_ACCOUNTS_KEY }),
  });
}
