"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { BriefingPanel } from "@/components/content-editor/BriefingPanel";
import { TemplateSelector } from "@/components/content-editor/TemplateSelector";
import { SlideEditor } from "@/components/content-editor/SlideEditor";
import { NetworkSelector, type TargetNetwork } from "@/components/content-editor/NetworkSelector";
import { PreviewPane } from "@/components/content-editor/PreviewPane";
import {
  useContentPiece,
  useCreateContentPiece,
  useUpdateContentPieceTemplate,
} from "@/hooks/useContentEditor";
import type { Template } from "@/hooks/useTemplates";
import { trackFunnelEvent } from "@/lib/analytics/track-funnel-event";

function NewContentPageInner(): JSX.Element {
  const searchParams = useSearchParams();
  const insightIdFromQuery = searchParams.get("insightId") ?? undefined;
  const summaryFromQuery = searchParams.get("summary") ?? "";

  const [contentPieceId, setContentPieceId] = useState<string | null>(null);
  const [briefing, setBriefing] = useState("");
  const [targetNetwork, setTargetNetwork] = useState<TargetNetwork>("instagram");

  useEffect(() => {
    if (summaryFromQuery) setBriefing(summaryFromQuery);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const createPiece = useCreateContentPiece();
  const updateTemplate = useUpdateContentPieceTemplate(contentPieceId ?? "");
  const { data: piece } = useContentPiece(contentPieceId ?? undefined);

  function handleSelectTemplate(template: Template): void {
    if (!contentPieceId) {
      createPiece.mutate(
        { templateId: template.id, format: template.format, briefing, insightId: insightIdFromQuery },
        {
          onSuccess: (created) => {
            // Dispara em toda criação, não só na primeira de fato — o painel
            // de funil (spec 047) trata a primeira ocorrência por usuário
            // como o passo de conversão, mesmo padrão do PostHog pra eventos
            // "first time" dentro de um funil.
            void trackFunnelEvent("first_content_piece_created", { contentPieceId: created.id });
            setContentPieceId(created.id);
          },
        },
      );
    } else {
      updateTemplate.mutate(template.id);
    }
  }

  const zones = piece?.template?.slotMap?.zones ?? [];
  const canRender = !!piece && piece.slides.length > 0 && piece.slides.every((s) => !!s.backgroundImageUrl);

  return (
    <main className="mx-auto grid max-w-6xl grid-cols-1 gap-8 p-6 lg:grid-cols-2">
      <div className="space-y-6">
        <h1 className="text-xl font-semibold">Novo conteúdo</h1>

        {insightIdFromQuery && (
          <p className="text-xs text-neutral-600">Criando a partir de um insight de pesquisa selecionado.</p>
        )}

        {!contentPieceId && <BriefingPanel value={briefing} onChange={setBriefing} />}

        <TemplateSelector selectedTemplateId={piece?.templateId ?? null} onSelect={handleSelectTemplate} />

        {piece && (
          <>
            <div className="space-y-3">
              <h3 className="text-sm font-semibold">Conteúdo dos slides</h3>
              {piece.slides.map((slide) => {
                const textZone = zones.find(
                  (z) => (z.slideIndex ?? 0) === slide.slideOrder && z.type === "text",
                );
                return (
                  <SlideEditor
                    key={slide.id}
                    contentPieceId={contentPieceId!}
                    slide={slide}
                    textZone={textZone}
                  />
                );
              })}
            </div>

            <NetworkSelector value={targetNetwork} onChange={setTargetNetwork} format={piece.format} />
          </>
        )}
      </div>

      <div>
        {contentPieceId ? (
          <PreviewPane contentPieceId={contentPieceId} targetNetwork={targetNetwork} canRender={canRender} />
        ) : (
          <div className="flex aspect-square items-center justify-center rounded-lg border border-dashed border-neutral-200 text-sm text-neutral-600">
            Escolha um template para começar
          </div>
        )}
      </div>
    </main>
  );
}

export default function NewContentPage(): JSX.Element {
  return (
    <Suspense fallback={<main className="p-6 text-sm text-neutral-600">Carregando...</main>}>
      <NewContentPageInner />
    </Suspense>
  );
}
