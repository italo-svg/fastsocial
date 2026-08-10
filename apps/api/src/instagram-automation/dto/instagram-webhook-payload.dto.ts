// Shape real do payload de webhook da Meta pra Instagram (comments via
// "changes", DMs/story replies via "messaging") — ver
// https://developers.facebook.com/docs/messenger-platform/instagram/webhook
export interface InstagramWebhookPayload {
  object: string;
  entry: InstagramWebhookEntry[];
}

export interface InstagramWebhookEntry {
  id: string; // external_account_id da página/conta IG que recebeu o evento
  time?: number;
  changes?: { field: string; value: { text?: string; from?: { id?: string } } }[];
  messaging?: {
    sender?: { id?: string };
    recipient?: { id?: string };
    message?: { text?: string; is_echo?: boolean };
  }[];
}

export interface NormalizedInstagramEvent {
  externalAccountId: string;
  triggerType: "comment" | "message" | "story_reply";
  text: string;
}
