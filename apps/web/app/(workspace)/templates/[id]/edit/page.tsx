"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useParams, useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useTemplate, useUpdateTemplate, type TemplateZone } from "@/hooks/useTemplates";

const SlotMapEditor = dynamic(
  () => import("@/components/templates/SlotMapEditor").then((m) => m.SlotMapEditor),
  { ssr: false },
);

const ZONE_TYPE_LABELS: Record<TemplateZone["type"], string> = {
  text: "Texto",
  image: "Imagem",
  logo: "Logo",
};

let zoneCounter = 0;
function nextZoneId(): string {
  zoneCounter += 1;
  return `zone-${Date.now()}-${zoneCounter}`;
}

export default function TemplateEditPage(): JSX.Element {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { data: template, isLoading } = useTemplate(params.id);
  const updateTemplate = useUpdateTemplate(params.id);

  const [zones, setZones] = useState<TemplateZone[] | null>(null);
  const [slideIndex, setSlideIndex] = useState(0);
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (template && zones === null) {
      setZones(template.slotMap?.zones ?? []);
    }
  }, [template, zones]);

  if (isLoading || zones === null) {
    return (
      <main className="mx-auto max-w-5xl p-6">
        <p className="text-sm text-neutral-600">Carregando...</p>
      </main>
    );
  }

  if (!template) {
    return (
      <main className="mx-auto max-w-5xl p-6">
        <p className="text-sm text-neutral-600">Template não encontrado.</p>
      </main>
    );
  }

  const readOnly = template.isSystemTemplate;
  const backgroundImages = template.slotMap?.backgroundImages ?? [];
  const totalSlides = Math.max(backgroundImages.length, 1);
  const currentImage = backgroundImages[slideIndex] ?? template.previewUrl ?? undefined;
  const slideZones = zones.filter((z) => (z.slideIndex ?? 0) === slideIndex);

  function addZone(type: TemplateZone["type"]): void {
    const id = nextZoneId();
    const newZone: TemplateZone = {
      id,
      type,
      slideIndex,
      x: 40,
      y: 40,
      width: 200,
      height: 100,
      label: ZONE_TYPE_LABELS[type],
    };
    setZones([...(zones ?? []), newZone]);
    setSelectedZoneId(id);
  }

  function handleSlideZonesChange(updatedSlideZones: TemplateZone[]): void {
    const others = (zones ?? []).filter((z) => (z.slideIndex ?? 0) !== slideIndex);
    setZones([...others, ...updatedSlideZones]);
  }

  function updateZoneField(id: string, patch: Partial<TemplateZone>): void {
    setZones((zones ?? []).map((z) => (z.id === id ? { ...z, ...patch } : z)));
  }

  function removeZone(id: string): void {
    setZones((zones ?? []).filter((z) => z.id !== id));
    if (selectedZoneId === id) setSelectedZoneId(null);
  }

  function handleSave(): void {
    setSaved(false);
    updateTemplate.mutate(
      { slotMap: { zones: zones ?? [], backgroundImages } },
      { onSuccess: () => setSaved(true) },
    );
  }

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={() => router.push("/templates")}>
            Voltar
          </Button>
          <h1 className="text-xl font-semibold">Editor de template</h1>
          <Badge variant={readOnly ? "neutral" : "success"}>{readOnly ? "Sistema" : "Seu"}</Badge>
        </div>
        {!readOnly && (
          <Button onClick={handleSave} disabled={updateTemplate.isPending}>
            {updateTemplate.isPending ? "Salvando..." : "Salvar"}
          </Button>
        )}
      </div>

      {readOnly && (
        <p className="text-sm text-neutral-600">
          Este é um template de sistema — somente visualização. Importe ou crie um template próprio
          para editar as zonas.
        </p>
      )}
      {saved && <p className="text-sm text-success">Alterações salvas.</p>}

      {totalSlides > 1 && (
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setSlideIndex((s) => Math.max(0, s - 1))}
            disabled={slideIndex === 0}
          >
            Slide anterior
          </Button>
          <span className="text-sm text-neutral-600">
            Slide {slideIndex + 1} de {totalSlides}
          </span>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setSlideIndex((s) => Math.min(totalSlides - 1, s + 1))}
            disabled={slideIndex === totalSlides - 1}
          >
            Próximo slide
          </Button>
        </div>
      )}

      <div className="flex flex-wrap gap-6">
        <SlotMapEditor
          imageUrl={currentImage}
          zones={slideZones}
          onChange={handleSlideZonesChange}
          readOnly={readOnly}
          selectedZoneId={selectedZoneId}
          onSelectZone={setSelectedZoneId}
        />

        <div className="min-w-[260px] flex-1 space-y-4">
          {!readOnly && (
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => addZone("text")}>
                + Texto
              </Button>
              <Button variant="secondary" size="sm" onClick={() => addZone("image")}>
                + Imagem
              </Button>
              <Button variant="secondary" size="sm" onClick={() => addZone("logo")}>
                + Logo
              </Button>
            </div>
          )}

          <div className="space-y-2">
            {slideZones.length === 0 && (
              <p className="text-sm text-neutral-600">Nenhuma zona neste slide.</p>
            )}
            {slideZones.map((zone) => (
              <Card
                key={zone.id}
                className={
                  selectedZoneId === zone.id ? "space-y-2 border-primary p-3 ring-1 ring-primary" : "space-y-2 p-3"
                }
                onClick={() => setSelectedZoneId(zone.id)}
              >
                <div className="flex items-center justify-between">
                  <Badge variant="neutral">{ZONE_TYPE_LABELS[zone.type]}</Badge>
                  {!readOnly && (
                    <button
                      type="button"
                      className="text-xs text-danger"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeZone(zone.id);
                      }}
                    >
                      Remover
                    </button>
                  )}
                </div>
                <Input
                  placeholder="Nome da zona (ex: headline)"
                  value={zone.label ?? ""}
                  disabled={readOnly}
                  onChange={(e) => updateZoneField(zone.id, { label: e.target.value })}
                />
                {zone.type === "text" && (
                  <Input
                    type="number"
                    placeholder="Tamanho máximo do texto (opcional)"
                    value={zone.maxLength ?? ""}
                    disabled={readOnly}
                    onChange={(e) =>
                      updateZoneField(zone.id, {
                        maxLength: e.target.value ? parseInt(e.target.value, 10) : undefined,
                      })
                    }
                  />
                )}
              </Card>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
