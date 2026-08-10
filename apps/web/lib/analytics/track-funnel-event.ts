"use client";

import { createClient } from "@/lib/supabase/client";
import { getAnonymousId, getUtmFromUrl, initPosthog } from "./posthog-client";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333";

export type FunnelEventName =
  | "landing_viewed"
  | "signup_started"
  | "signup_completed"
  | "email_confirmed"
  | "onboarding_completed"
  | "first_content_piece_created"
  | "trial_converted_to_paid";

// Dispara pro PostHog (exploração ad-hoc) E pra tabela própria funnel_events
// (spec 046, painel de funil do spec 047) — os dois convivem de propósito.
// Nunca lança: uma falha de tracking não pode travar a jornada real do
// usuário (mesmo espírito do ErrorTrackingService, spec 044).
export async function trackFunnelEvent(eventName: FunnelEventName, metadata?: Record<string, unknown>): Promise<void> {
  const client = initPosthog();
  client?.capture(eventName, metadata);

  const anonymousId = getAnonymousId();
  if (!anonymousId) return; // PostHog não configurado — sem anonymous_id não há como correlacionar no backend.

  try {
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    await fetch(`${API_URL}/api/v1/funnel/events`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
      },
      body: JSON.stringify({ anonymousId, eventName, utm: getUtmFromUrl(), metadata }),
    });
  } catch {
    // best-effort — ver comentário acima.
  }
}
