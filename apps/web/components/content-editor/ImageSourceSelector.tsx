import { useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUpdateContentSlide, useUploadSlideImage, type ContentSlide } from "@/hooks/useContentEditor";
import { useGenerateAndEvaluateImage } from "@/hooks/useImageGeneration";
import { useStockImageSearch, useStockImagesStatus, type StockImage } from "@/hooks/useStockImages";

const OPTIONS: { value: ContentSlide["imageSource"]; label: string }[] = [
  { value: "own_library", label: "Biblioteca Própria" },
  { value: "stock_bank", label: "Banco de Imagens" },
  { value: "ai_generated", label: "Geração com IA" },
];

interface ImageSourceSelectorProps {
  contentPieceId: string;
  slide: ContentSlide;
}

export function ImageSourceSelector({ contentPieceId, slide }: ImageSourceSelectorProps): JSX.Element {
  const updateSlide = useUpdateContentSlide(contentPieceId);
  const uploadImage = useUploadSlideImage(contentPieceId);
  const generateImage = useGenerateAndEvaluateImage();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [stockQuery, setStockQuery] = useState("");
  const { data: stockStatus } = useStockImagesStatus();
  const { data: stockResults, isFetching: searchingStock } = useStockImageSearch(stockQuery);

  const [genState, setGenState] = useState<"idle" | "loading" | "escalated" | "error">("idle");

  function handleSourceChange(value: ContentSlide["imageSource"]): void {
    updateSlide.mutate({ slideId: slide.id, data: { imageSource: value } });
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>): void {
    const file = e.target.files?.[0];
    if (!file) return;
    uploadImage.mutate({ slideId: slide.id, file });
  }

  function handleSelectStock(image: StockImage): void {
    updateSlide.mutate({
      slideId: slide.id,
      data: { backgroundImageUrl: image.fullUrl, imageSource: "stock_bank" },
    });
  }

  function handleGenerate(): void {
    setGenState("loading");
    generateImage.mutate(slide.id, {
      onSuccess: (job) => {
        if (job.resultImageUrl && job.status === "qa_passed") {
          updateSlide.mutate({
            slideId: slide.id,
            data: { backgroundImageUrl: job.resultImageUrl, imageSource: "ai_generated" },
          });
          setGenState("idle");
        } else if (job.status === "escalated_to_human") {
          setGenState("escalated");
        } else {
          setGenState("error");
        }
      },
      onError: () => setGenState("error"),
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        {OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            className={cn(
              "rounded-lg border px-2.5 py-1.5 text-xs font-medium",
              slide.imageSource === option.value
                ? "border-primary bg-primary/10 text-primary"
                : "border-neutral-200",
            )}
            onClick={() => handleSourceChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>

      {slide.imageSource === "own_library" && (
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg"
            className="hidden"
            onChange={handleFileChange}
          />
          <Button
            variant="secondary"
            size="sm"
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadImage.isPending}
          >
            {uploadImage.isPending ? "Enviando..." : slide.backgroundImageUrl ? "Trocar imagem" : "Enviar imagem"}
          </Button>
        </div>
      )}

      {slide.imageSource === "stock_bank" && (
        <div className="space-y-2">
          {stockStatus && !stockStatus.configured && (
            <p className="text-xs text-warning">Banco de imagens não configurado no momento.</p>
          )}
          {stockStatus?.configured && (
            <>
              <Input
                placeholder="Buscar imagens..."
                value={stockQuery}
                onChange={(e) => setStockQuery(e.target.value)}
              />
              {searchingStock && <p className="text-xs text-neutral-600">Buscando...</p>}
              <div className="flex flex-wrap gap-2">
                {stockResults?.map((img) => (
                  <button
                    key={img.id}
                    type="button"
                    onClick={() => handleSelectStock(img)}
                    className="h-16 w-16 overflow-hidden rounded border border-neutral-200"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img.thumbnailUrl} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {slide.imageSource === "ai_generated" && (
        <div className="space-y-2">
          <Button
            variant="secondary"
            size="sm"
            type="button"
            onClick={handleGenerate}
            disabled={genState === "loading"}
          >
            {genState === "loading" ? "Gerando e verificando qualidade..." : "Gerar imagem"}
          </Button>
          {genState === "escalated" && (
            <p className="text-xs text-warning">
              Imagem não passou no QA automático — aguardando revisão manual.
            </p>
          )}
          {genState === "error" && <p className="text-xs text-danger">Não foi possível gerar a imagem agora.</p>}
        </div>
      )}

      {slide.backgroundImageUrl && (
        <div className="h-20 w-20 overflow-hidden rounded border border-neutral-200">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={slide.backgroundImageUrl} alt="" className="h-full w-full object-cover" />
        </div>
      )}
    </div>
  );
}
