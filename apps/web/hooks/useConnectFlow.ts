"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/api-client";
import { useSyncSocialAccounts } from "./useSocialAccounts";

export type ConnectFlowState = "idle" | "connecting" | "timeout" | "error";

const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 60000;

// Popups de OAuth bloqueados pelo navegador se abertos depois de um `await`:
// abrimos a janela SÍNCRONA no clique (about:blank) e só então buscamos a URL
// real via fetch, atualizando `location` do popup já aberto (nota do spec 031).
// Compartilhado entre o botão "Conectar" (ConnectButton) e "Reconectar"
// (AccountCard) — os dois disparam exatamente o mesmo fluxo.
export function useConnectFlow(provider: "meta" | "linkedin", onDone: () => void) {
  const [state, setState] = useState<ConnectFlowState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { mutateAsync: syncAccounts } = useSyncSocialAccounts();

  async function connect(): Promise<void> {
    setState("connecting");
    setErrorMessage(null);

    const popup = window.open("about:blank", "fastsocial-oauth", "width=600,height=720");

    let url: string;
    try {
      const endpoint = provider === "meta" ? "/social-accounts/connect/meta" : "/social-accounts/connect/linkedin";
      const method = provider === "meta" ? "POST" : "GET";
      // Achado numa varredura do frontend: o body nunca era enviado, então o
      // ConnectAccountDto (que exige "facebook"|"instagram") rejeitava a
      // requisição com 400 de validação ANTES de chegar na mensagem real e já
      // documentada do backend (spec 028: conectar conta nova ainda não é
      // possível sem acesso direto ao Postiz) — o usuário via um erro de
      // validação genérico em vez do aviso correto.
      const body = provider === "meta" ? JSON.stringify({ provider: "instagram" }) : undefined;
      const response = await apiFetch<{ url: string }>(endpoint, { method, body });
      url = response.url;
    } catch (err) {
      popup?.close();
      setState("error");
      setErrorMessage(err instanceof Error ? err.message : "Falha ao iniciar conexão.");
      return;
    }

    if (!popup) {
      setState("error");
      setErrorMessage("O navegador bloqueou o popup de conexão. Permita popups para este site e tente de novo.");
      return;
    }
    popup.location.href = url;

    const startedAt = Date.now();
    const interval = setInterval(() => {
      void (async () => {
        if (popup.closed) {
          clearInterval(interval);
          if (provider === "meta") {
            try {
              await syncAccounts();
            } catch {
              // Sync falhar não deve travar a UI — a lista só não vai refletir a nova conta ainda.
            }
          }
          onDone();
          setState("idle");
          return;
        }

        if (Date.now() - startedAt > POLL_TIMEOUT_MS) {
          clearInterval(interval);
          popup.close();
          setState("timeout");
        }
      })();
    }, POLL_INTERVAL_MS);
  }

  return { connect, state, errorMessage };
}
