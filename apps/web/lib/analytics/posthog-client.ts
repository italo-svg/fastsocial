"use client";

import posthog from "posthog-js";

let initialized = false;

// Sem NEXT_PUBLIC_POSTHOG_KEY/HOST configurados, degrada silenciosamente
// (retorna null) em vez de quebrar a build/app — mesmo padrão já usado pra
// Unsplash/fal.ai/Anthropic (specs 016/017/018/040).
export function initPosthog(): typeof posthog | null {
  if (typeof window === "undefined") return null;

  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;
  if (!key || !host) return null;

  if (!initialized) {
    posthog.init(key, {
      api_host: host,
      capture_pageview: true,
      persistence: "localStorage+cookie",
    });
    initialized = true;
  }
  return posthog;
}

// anonymous_id do PostHog reusado como anonymous_id da tabela própria
// funnel_events (spec 046) — evita manter dois IDs anônimos em paralelo.
export function getAnonymousId(): string | null {
  const client = initPosthog();
  return client?.get_distinct_id() ?? null;
}

export function getUtmFromUrl(): Record<string, string> | undefined {
  if (typeof window === "undefined") return undefined;
  const params = new URLSearchParams(window.location.search);
  const utm: Record<string, string> = {};
  for (const key of ["source", "medium", "campaign", "term", "content"]) {
    const value = params.get(`utm_${key}`);
    if (value) utm[key] = value;
  }
  return Object.keys(utm).length > 0 ? utm : undefined;
}
