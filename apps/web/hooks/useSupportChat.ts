"use client";

import { useMutation } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";

export interface SupportChatResponse {
  reply: string;
  resolved: boolean;
  suggestedArticles: { slug: string; title: string }[];
  conversationId: string;
}

export function useSendSupportMessage() {
  return useMutation({
    mutationFn: (input: { message: string; conversationId?: string }) =>
      apiFetch<SupportChatResponse>("/support-chat/messages", {
        method: "POST",
        body: JSON.stringify(input),
      }),
  });
}
