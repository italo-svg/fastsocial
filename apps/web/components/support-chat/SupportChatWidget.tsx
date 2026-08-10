"use client";

import { useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { extractApiErrorMessage } from "@/lib/api-client";
import { useSendSupportMessage } from "@/hooks/useSupportChat";

interface ChatEntry {
  role: "user" | "assistant";
  text: string;
  resolved?: boolean;
  suggestedArticles?: { slug: string; title: string }[];
}

// CA-04: fixed + z-50, canto oposto ao ProductTour (bottom-left) pra nunca
// sobrepor — disponível em todas as telas (workspace)/* via layout.tsx do
// grupo de rotas, não precisa ser montado página por página.
export function SupportChatWidget(): JSX.Element {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<ChatEntry[]>([]);
  const [conversationId, setConversationId] = useState<string | undefined>(undefined);
  const sendMessage = useSendSupportMessage();

  function handleSend(): void {
    const message = input.trim();
    if (!message) return;
    setHistory((prev) => [...prev, { role: "user", text: message }]);
    setInput("");
    sendMessage.mutate(
      { message, conversationId },
      {
        onSuccess: (res) => {
          setConversationId(res.conversationId);
          setHistory((prev) => [
            ...prev,
            { role: "assistant", text: res.reply, resolved: res.resolved, suggestedArticles: res.suggestedArticles },
          ]);
        },
      },
    );
  }

  return (
    <div className="fixed bottom-6 left-6 z-50">
      {open && (
        <Card className="mb-3 flex h-96 w-80 flex-col p-0 shadow-lg">
          <div className="flex items-center justify-between border-b border-[var(--card-border)] p-3">
            <h3 className="text-sm font-semibold">Suporte</h3>
            <button type="button" onClick={() => setOpen(false)} className="text-neutral-400 hover:text-neutral-600">
              ✕
            </button>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto p-3">
            {history.length === 0 && (
              <p className="text-xs text-neutral-500">Pergunte algo sobre o FastSocial — respondo com base na nossa central de ajuda.</p>
            )}
            {history.map((entry, i) => (
              <div key={i} className={entry.role === "user" ? "text-right" : "text-left"}>
                <p
                  className={`inline-block max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                    entry.role === "user" ? "bg-primary text-white" : "bg-neutral-100 text-neutral-900"
                  }`}
                >
                  {entry.text}
                </p>
                {entry.role === "assistant" && entry.resolved === false && (
                  <div className="mt-1">
                    <a href="mailto:suporte@fastsocial.com.br" className="text-xs font-medium text-primary underline">
                      Falar com suporte humano →
                    </a>
                  </div>
                )}
                {entry.role === "assistant" && entry.suggestedArticles && entry.suggestedArticles.length > 0 && (
                  <div className="mt-1 space-y-0.5">
                    {entry.suggestedArticles.map((article) => (
                      <Link key={article.slug} href={`/help/${article.slug}`} className="block text-xs text-primary underline">
                        {article.title}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {sendMessage.isPending && <p className="text-xs text-neutral-500">Digitando...</p>}
            {sendMessage.isError && (
              <p className="text-xs text-danger">{extractApiErrorMessage(sendMessage.error, "Não foi possível enviar a mensagem.")}</p>
            )}
          </div>

          <div className="flex items-end gap-2 border-t border-[var(--card-border)] p-3">
            <Textarea
              rows={1}
              placeholder="Digite sua dúvida..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              className="min-h-0"
            />
            <Button type="button" size="sm" disabled={sendMessage.isPending || !input.trim()} onClick={handleSend}>
              Enviar
            </Button>
          </div>
        </Card>
      )}

      <Button type="button" onClick={() => setOpen((v) => !v)} className="h-12 w-12 rounded-full p-0 shadow-lg">
        💬
      </Button>
    </div>
  );
}
