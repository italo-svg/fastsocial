import { useState } from "react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { useTemplates, type Template } from "@/hooks/useTemplates";

interface TemplateSelectorProps {
  selectedTemplateId: string | null;
  onSelect: (template: Template) => void;
}

export function TemplateSelector({ selectedTemplateId, onSelect }: TemplateSelectorProps): JSX.Element {
  const [source, setSource] = useState<"system" | "own">("system");
  const { data: templates, isLoading } = useTemplates(source);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Template</h3>
        <div className="inline-flex rounded-lg border border-neutral-200 p-0.5 text-xs">
          <button
            type="button"
            className={cn("rounded px-2 py-1 font-medium", source === "system" && "bg-primary text-white")}
            onClick={() => setSource("system")}
          >
            Sistema
          </button>
          <button
            type="button"
            className={cn("rounded px-2 py-1 font-medium", source === "own" && "bg-primary text-white")}
            onClick={() => setSource("own")}
          >
            Seus
          </button>
        </div>
      </div>

      {isLoading && <p className="text-sm text-neutral-600">Carregando...</p>}

      <div className="grid grid-cols-3 gap-2">
        {templates?.map((template) => (
          <Card
            key={template.id}
            className={cn(
              "cursor-pointer space-y-1 p-2 transition-shadow hover:shadow-md",
              selectedTemplateId === template.id && "border-primary ring-1 ring-primary",
            )}
            onClick={() => onSelect(template)}
          >
            <div className="flex aspect-square items-center justify-center overflow-hidden rounded bg-neutral-100">
              {template.previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={template.previewUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="text-[10px] text-neutral-400">Sem preview</span>
              )}
            </div>
            <span className="block text-center text-[11px] text-neutral-600">
              {template.format === "carousel" ? "Carrossel" : "Post"}
            </span>
          </Card>
        ))}
      </div>

      {templates?.length === 0 && !isLoading && (
        <p className="text-sm text-neutral-600">Nenhum template disponível.</p>
      )}
    </div>
  );
}
