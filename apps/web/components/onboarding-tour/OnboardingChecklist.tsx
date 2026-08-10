"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/stores/auth.store";
import { useOnboardingProgress, type OnboardingProgress } from "@/hooks/useOnboardingTour";

const ITEMS: { key: keyof OnboardingProgress; label: string }[] = [
  { key: "connectedSocialAccount", label: "Conecte uma rede social" },
  { key: "autopilotConfigured", label: "Configure o piloto automático" },
  { key: "firstPostPublished", label: "Publique seu primeiro post" },
];

// item 2 do spec 051: cada item reflete um evento REAL do sistema (consultado
// via GET /workspaces/:id/onboarding-progress), nunca uma confirmação manual
// do usuário — ver workspaces.service.ts#getOnboardingProgress.
export function OnboardingChecklist(): JSX.Element | null {
  const activeWorkspaceId = useAuthStore((s) => s.activeWorkspaceId);
  const { data: progress, isLoading } = useOnboardingProgress(activeWorkspaceId ?? undefined);

  if (isLoading || !progress) return null;
  const allDone = ITEMS.every((item) => progress[item.key]);
  if (allDone) return null;

  return (
    <Card className="space-y-2">
      <h3 className="text-sm font-semibold">Primeiros passos</h3>
      <ul className="space-y-1">
        {ITEMS.map((item) => {
          const done = progress[item.key];
          return (
            <li key={item.key} className="flex items-center gap-2 text-sm">
              <Badge variant={done ? "success" : "neutral"}>{done ? "✓" : "○"}</Badge>
              <span className={done ? "text-neutral-400 line-through" : ""}>{item.label}</span>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
