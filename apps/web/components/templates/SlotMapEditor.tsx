"use client";

import { useEffect, useRef, useState } from "react";
import { Image as KonvaImage, Layer, Rect, Stage, Transformer } from "react-konva";
import type Konva from "konva";
import type { TemplateZone } from "@/hooks/useTemplates";

const CANVAS_WIDTH = 480;

const ZONE_COLORS: Record<TemplateZone["type"], string> = {
  text: "#4F46E5",
  image: "#22C55E",
  logo: "#F59E0B",
};

function useHtmlImage(url: string | undefined): HTMLImageElement | null {
  const [image, setImage] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    if (!url) {
      setImage(null);
      return;
    }
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => setImage(img);
    img.src = url;
    return () => setImage(null);
  }, [url]);

  return image;
}

interface SlotMapEditorProps {
  imageUrl?: string;
  zones: TemplateZone[];
  onChange: (zones: TemplateZone[]) => void;
  readOnly?: boolean;
  selectedZoneId: string | null;
  onSelectZone: (id: string | null) => void;
}

export function SlotMapEditor({
  imageUrl,
  zones,
  onChange,
  readOnly,
  selectedZoneId,
  onSelectZone,
}: SlotMapEditorProps): JSX.Element {
  const image = useHtmlImage(imageUrl);
  const trRef = useRef<Konva.Transformer>(null);
  const shapeRefs = useRef<Record<string, Konva.Rect | null>>({});

  const naturalWidth = image?.naturalWidth ?? CANVAS_WIDTH;
  const naturalHeight = image?.naturalHeight ?? CANVAS_WIDTH;
  const scale = CANVAS_WIDTH / naturalWidth;
  const canvasHeight = Math.round(naturalHeight * scale);

  useEffect(() => {
    if (!trRef.current) return;
    const node = selectedZoneId ? shapeRefs.current[selectedZoneId] : null;
    if (node) {
      trRef.current.nodes([node]);
    } else {
      trRef.current.nodes([]);
    }
    trRef.current.getLayer()?.batchDraw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedZoneId, zones]);

  function updateZone(id: string, patch: Partial<TemplateZone>): void {
    onChange(zones.map((z) => (z.id === id ? { ...z, ...patch } : z)));
  }

  return (
    <div
      className="overflow-hidden rounded-lg border border-neutral-200 bg-neutral-100"
      style={{ width: CANVAS_WIDTH, height: canvasHeight }}
    >
      <Stage
        width={CANVAS_WIDTH}
        height={canvasHeight}
        onMouseDown={(e) => {
          if (e.target === e.target.getStage()) onSelectZone(null);
        }}
      >
        <Layer>
          {image && <KonvaImage image={image} width={CANVAS_WIDTH} height={canvasHeight} />}
          {zones.map((zone) => (
            <Rect
              key={zone.id}
              ref={(node) => {
                shapeRefs.current[zone.id] = node;
              }}
              x={zone.x * scale}
              y={zone.y * scale}
              width={zone.width * scale}
              height={zone.height * scale}
              fill={`${ZONE_COLORS[zone.type]}33`}
              stroke={ZONE_COLORS[zone.type]}
              strokeWidth={2}
              draggable={!readOnly}
              onClick={() => onSelectZone(zone.id)}
              onTap={() => onSelectZone(zone.id)}
              onDragEnd={(e) =>
                updateZone(zone.id, {
                  x: Math.round(e.target.x() / scale),
                  y: Math.round(e.target.y() / scale),
                })
              }
              onTransformEnd={(e) => {
                const node = e.target as Konva.Rect;
                const scaleX = node.scaleX();
                const scaleY = node.scaleY();
                node.scaleX(1);
                node.scaleY(1);
                updateZone(zone.id, {
                  x: Math.round(node.x() / scale),
                  y: Math.round(node.y() / scale),
                  width: Math.round((node.width() * scaleX) / scale),
                  height: Math.round((node.height() * scaleY) / scale),
                });
              }}
            />
          ))}
          {!readOnly && <Transformer ref={trRef} rotateEnabled={false} />}
        </Layer>
      </Stage>
    </div>
  );
}
