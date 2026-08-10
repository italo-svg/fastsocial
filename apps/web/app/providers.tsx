"use client";

import { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { initPosthog } from "@/lib/analytics/posthog-client";

export function Providers({ children }: { children: React.ReactNode }): JSX.Element {
  const [queryClient] = useState(() => new QueryClient());

  // Inicializa o PostHog aqui (não só na landing) pra $pageview automático
  // (spec 046) cobrir toda a navegação, não só as páginas com trackFunnelEvent.
  useEffect(() => {
    initPosthog();
  }, []);

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
