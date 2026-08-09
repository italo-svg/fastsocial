import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useRenderContentPiece } from "@/hooks/useContentEditor";
import type { TargetNetwork } from "./NetworkSelector";

interface PreviewPaneProps {
  contentPieceId: string;
  targetNetwork: TargetNetwork;
  canRender: boolean;
}

export function PreviewPane({ contentPieceId, targetNetwork, canRender }: PreviewPaneProps): JSX.Element {
  const renderPiece = useRenderContentPiece(contentPieceId);
  const [error, setError] = useState<string | null>(null);

  function handleRender(): void {
    setError(null);
    renderPiece.mutate(targetNetwork, {
      onError: (err) => setError(err instanceof Error ? err.message : "Falha ao renderizar."),
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Preview</h3>
        <Button size="sm" onClick={handleRender} disabled={!canRender || renderPiece.isPending}>
          {renderPiece.isPending ? "Renderizando..." : "Renderizar preview"}
        </Button>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      {renderPiece.data && (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-3">
            {renderPiece.data.slides.map((slide) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={slide.order}
                src={slide.imageUrl}
                alt={`Slide ${slide.order}`}
                className="max-w-[280px] rounded-lg border border-neutral-200"
              />
            ))}
          </div>
          {renderPiece.data.documentUrl && (
            <a
              href={renderPiece.data.documentUrl}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-primary underline"
            >
              Ver documento PDF gerado
            </a>
          )}
        </div>
      )}

      {!renderPiece.data && !renderPiece.isPending && (
        <div className="flex aspect-square items-center justify-center rounded-lg border border-dashed border-neutral-200 text-sm text-neutral-600">
          O preview aparece aqui
        </div>
      )}
    </div>
  );
}
