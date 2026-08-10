"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CadenceInput } from "@/components/autopilot/CadenceInput";
import { FormatMixSlider } from "@/components/autopilot/FormatMixSlider";
import { PreferredTimesInput } from "@/components/autopilot/PreferredTimesInput";
import { ActivationToggle } from "@/components/autopilot/ActivationToggle";
import { RunsHistory } from "@/components/autopilot/RunsHistory";
import { extractApiErrorMessage } from "@/lib/api-client";
import { useAutopilot, useAutopilotRuns, useUpdateAutopilot } from "@/hooks/useAutopilot";

interface FormState {
  postsPerWeek: number;
  staticPostRatio: number;
  requiresApproval: boolean;
  preferredTimes: string[];
}

const DEFAULT_FORM: FormState = {
  postsPerWeek: 3,
  staticPostRatio: 0.5,
  requiresApproval: true,
  preferredTimes: ["09:00", "18:00"],
};

export default function AutopilotPage(): JSX.Element {
  const { data: autopilot, isLoading } = useAutopilot();
  const { data: runs, isLoading: isLoadingRuns } = useAutopilotRuns();
  const updateMutation = useUpdateAutopilot();

  const [form, setForm] = useState<FormState | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (form !== null) return;
    if (autopilot) {
      setForm({
        postsPerWeek: autopilot.postsPerWeek,
        staticPostRatio: autopilot.formatMix.static_post ?? 0.5,
        requiresApproval: autopilot.requiresApproval,
        preferredTimes: autopilot.preferredTimes,
      });
    } else if (autopilot === null) {
      setForm(DEFAULT_FORM);
    }
  }, [autopilot, form]);

  if (isLoading || form === null) {
    return (
      <main className="mx-auto max-w-3xl p-6">
        <p className="text-sm text-neutral-600">Carregando...</p>
      </main>
    );
  }

  function handleSave(): void {
    if (!form) return;
    setSaveError(null);
    setSaved(false);
    updateMutation.mutate(
      {
        postsPerWeek: form.postsPerWeek,
        formatMix: { static_post: form.staticPostRatio, carousel: 1 - form.staticPostRatio },
        requiresApproval: form.requiresApproval,
        preferredTimes: form.preferredTimes,
      },
      {
        onSuccess: () => setSaved(true),
        onError: (err) => setSaveError(extractApiErrorMessage(err, "Não foi possível salvar a configuração.")),
      },
    );
  }

  const carouselPct = Math.round((1 - form.staticPostRatio) * 100);
  const staticPct = 100 - carouselPct;
  const previewText = `Aprox. ${form.postsPerWeek} posts/semana, ${staticPct}% post estático e ${carouselPct}% carrossel, ${
    form.requiresApproval ? "com aprovação manual antes de publicar" : "publicando sem aprovação manual"
  }.`;

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      <div>
        <h1 className="text-xl font-semibold">Piloto Automático</h1>
        <p className="mt-1 text-sm text-neutral-600">
          Configure a cadência, o mix de formatos e os horários — o FastSocial cuida do resto.
        </p>
      </div>

      {autopilot && <ActivationToggle isActive={autopilot.isActive} />}

      <Card className="space-y-5">
        <h2 className="text-base font-semibold">Configuração</h2>

        <CadenceInput
          value={form.postsPerWeek}
          onChange={(postsPerWeek) => {
            setForm({ ...form, postsPerWeek });
            setSaved(false);
          }}
        />

        <FormatMixSlider
          staticPostRatio={form.staticPostRatio}
          onChange={(staticPostRatio) => {
            setForm({ ...form, staticPostRatio });
            setSaved(false);
          }}
        />

        <PreferredTimesInput
          value={form.preferredTimes}
          onChange={(preferredTimes) => {
            setForm({ ...form, preferredTimes });
            setSaved(false);
          }}
        />

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.requiresApproval}
            onChange={(e) => {
              setForm({ ...form, requiresApproval: e.target.checked });
              setSaved(false);
            }}
            className="h-4 w-4 accent-primary"
          />
          Exigir aprovação manual antes de publicar
        </label>

        <div className="rounded-lg bg-neutral-50 p-3 text-sm text-neutral-700">{previewText}</div>

        {saveError && <p className="rounded-lg bg-red-50 p-3 text-sm text-danger">{saveError}</p>}
        {saved && <p className="text-sm text-success">Configuração salva.</p>}

        <Button type="button" onClick={handleSave} disabled={updateMutation.isPending}>
          {updateMutation.isPending ? "Salvando..." : "Salvar configuração"}
        </Button>
      </Card>

      {!isLoadingRuns && <RunsHistory runs={runs ?? []} />}
    </main>
  );
}
