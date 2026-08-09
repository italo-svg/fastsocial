import { useState } from "react";
import { Card } from "@/components/ui/card";
import { ImageSourceSelector } from "./ImageSourceSelector";
import { useUpdateContentSlide, type ContentSlide } from "@/hooks/useContentEditor";
import type { TemplateZone } from "@/hooks/useTemplates";

interface SlideEditorProps {
  contentPieceId: string;
  slide: ContentSlide;
  textZone?: TemplateZone;
}

export function SlideEditor({ contentPieceId, slide, textZone }: SlideEditorProps): JSX.Element {
  const updateSlide = useUpdateContentSlide(contentPieceId);
  const [text, setText] = useState(slide.slideText ?? "");

  const exceedsMaxLength = !!textZone?.maxLength && text.length > textZone.maxLength;

  return (
    <Card className="space-y-3 p-3">
      <span className="text-xs font-medium text-neutral-600">Slide {slide.slideOrder + 1}</span>
      <textarea
        className="min-h-16 w-full rounded-lg border border-neutral-200 bg-white p-2 text-sm text-neutral-900 outline-none focus:border-primary focus:ring-1 focus:ring-primary"
        placeholder="Texto deste slide"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => updateSlide.mutate({ slideId: slide.id, data: { slideText: text } })}
      />
      {exceedsMaxLength && (
        <p className="text-xs text-warning">
          Texto excede o limite de {textZone!.maxLength} caracteres desta zona ({text.length}/{textZone!.maxLength})
          — será truncado na renderização.
        </p>
      )}
      <ImageSourceSelector contentPieceId={contentPieceId} slide={slide} />
    </Card>
  );
}
