import { Injectable } from "@nestjs/common";

const GRAPH_API_BASE = "https://graph.facebook.com/v19.0";

export interface QuickReplyOption {
  title: string;
  payload: string;
}

// Cliente HTTP puro (mesma decisão de anthropic.service.ts/storage.service.ts
// — sem SDK completo). Formato do endpoint conforme a documentação pública da
// Instagram Messaging API no momento da escrita; revisar contra a doc atual
// antes de ligar em produção real, mesma ressalva do fal-flux.provider.ts.
@Injectable()
export class InstagramMessagingClient {
  async sendTextMessage(accessToken: string, recipientId: string, text: string): Promise<{ messageId: string }> {
    return this.send(accessToken, recipientId, { text });
  }

  async sendQuickReplies(
    accessToken: string,
    recipientId: string,
    text: string,
    options: QuickReplyOption[],
  ): Promise<{ messageId: string }> {
    return this.send(accessToken, recipientId, {
      text,
      quick_replies: options.map((o) => ({ content_type: "text", title: o.title, payload: o.payload })),
    });
  }

  private async send(
    accessToken: string,
    recipientId: string,
    message: Record<string, unknown>,
  ): Promise<{ messageId: string }> {
    const res = await fetch(`${GRAPH_API_BASE}/me/messages?access_token=${encodeURIComponent(accessToken)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recipient: { id: recipientId }, message }),
    });

    if (!res.ok) {
      // CA-02: a janela de 24h expirada (regra real da Meta Messaging
      // Platform, ver Notas do spec) vem como um erro real da API aqui —
      // nunca escondido/engolido, propaga com a mensagem original da Meta.
      throw new Error(`Falha ao enviar mensagem via Instagram Messaging API: ${res.status} ${await res.text()}`);
    }

    const data = (await res.json()) as { message_id?: string };
    if (!data.message_id) {
      throw new Error("Instagram Messaging API não retornou message_id.");
    }
    return { messageId: data.message_id };
  }
}
