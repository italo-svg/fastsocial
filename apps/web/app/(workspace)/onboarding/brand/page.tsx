"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { ProgressDots } from "@/components/onboarding/ProgressDots";
import { WizardNav } from "@/components/onboarding/WizardNav";
import { Step1Niche } from "./_steps/Step1Niche";
import { Step2Voice } from "./_steps/Step2Voice";
import { Step3Visual, type Palette } from "./_steps/Step3Visual";
import { Step4ImageSource, type ImageSource } from "./_steps/Step4ImageSource";
import {
  useBrandKit,
  useDeleteReferenceImage,
  useUpdateBrandKit,
  useUploadLogo,
  useUploadReferenceImages,
} from "@/hooks/useBrandKit";

const TOTAL_STEPS = 4;

interface WizardState {
  niche: string;
  competitors: string[];
  toneOfVoice: string;
  examples: string;
  palette: Palette;
  fontFamily: string;
  imageSource: ImageSource;
}

const INITIAL_STATE: WizardState = {
  niche: "",
  competitors: [],
  toneOfVoice: "",
  examples: "",
  palette: { primary: "#4F46E5", secondary: "#111827", accent: "#22C55E" },
  fontFamily: "Inter",
  imageSource: "own_library",
};

export default function OnboardingBrandPage(): JSX.Element {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [state, setState] = useState<WizardState>(INITIAL_STATE);
  const [nicheError, setNicheError] = useState<string | null>(null);

  const { data: brandKit } = useBrandKit();
  const updateBrandKit = useUpdateBrandKit();
  const uploadLogo = useUploadLogo();
  const uploadReferenceImages = useUploadReferenceImages();
  const deleteReferenceImage = useDeleteReferenceImage();

  // Se já existir um brand kit parcialmente preenchido (ex: usuário saiu e voltou),
  // usa como ponto de partida para não perder progresso já salvo via uploads.
  useEffect(() => {
    if (!brandKit) return;
    setState((prev) => ({
      ...prev,
      niche: brandKit.niche ?? prev.niche,
      toneOfVoice: brandKit.toneOfVoice ?? prev.toneOfVoice,
      imageSource: (brandKit.defaultImageSource as ImageSource) ?? prev.imageSource,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brandKit?.workspaceId]);

  function handleNext(): void {
    if (step === 1) {
      if (!state.niche.trim()) {
        setNicheError("Informe o nicho da sua marca para continuar.");
        return;
      }
      setNicheError(null);
    }

    if (step === 3 && !state.palette.primary) {
      return;
    }

    if (step < TOTAL_STEPS) {
      setStep(step + 1);
      return;
    }

    handleFinish();
  }

  function handleBack(): void {
    setStep((s) => Math.max(1, s - 1));
  }

  function handleFinish(): void {
    const toneOfVoice = state.examples.trim()
      ? `${state.toneOfVoice}\n\nExemplos de texto da marca:\n${state.examples}`
      : state.toneOfVoice;

    updateBrandKit.mutate(
      {
        niche: state.niche,
        competitors: state.competitors.filter((c) => c.trim().length > 0),
        toneOfVoice,
        colorPalette: state.palette,
        typography: { fontFamily: state.fontFamily },
        defaultImageSource: state.imageSource,
      },
      {
        onSuccess: () => router.push("/onboarding/templates"),
      },
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-50 p-6">
      <div className="w-full max-w-lg space-y-6">
        <ProgressDots total={TOTAL_STEPS} current={step} />

        <Card className="space-y-6">
          {step === 1 && (
            <Step1Niche
              data={{ niche: state.niche, competitors: state.competitors }}
              onChange={(data) => setState((s) => ({ ...s, ...data }))}
              error={nicheError}
            />
          )}

          {step === 2 && (
            <Step2Voice
              data={{ toneOfVoice: state.toneOfVoice, examples: state.examples }}
              onChange={(data) => setState((s) => ({ ...s, ...data }))}
            />
          )}

          {step === 3 && (
            <Step3Visual
              logoUrl={brandKit?.logoUrl ?? null}
              uploadingLogo={uploadLogo.isPending}
              onUploadLogo={(file) => uploadLogo.mutate(file)}
              palette={state.palette}
              onPaletteChange={(palette) => setState((s) => ({ ...s, palette }))}
              fontFamily={state.fontFamily}
              onFontFamilyChange={(fontFamily) => setState((s) => ({ ...s, fontFamily }))}
            />
          )}

          {step === 4 && (
            <Step4ImageSource
              value={state.imageSource}
              onChange={(imageSource) => setState((s) => ({ ...s, imageSource }))}
              referenceImages={brandKit?.referenceImages ?? []}
              uploadingRefs={uploadReferenceImages.isPending}
              onUploadReferenceImages={(files) => uploadReferenceImages.mutate(files)}
              onDeleteReferenceImage={(index) => deleteReferenceImage.mutate(index)}
              warnings={brandKit?.warnings ?? []}
            />
          )}

          <WizardNav
            step={step}
            totalSteps={TOTAL_STEPS}
            onBack={handleBack}
            onNext={handleNext}
            loading={updateBrandKit.isPending}
          />
        </Card>
      </div>
    </main>
  );
}
