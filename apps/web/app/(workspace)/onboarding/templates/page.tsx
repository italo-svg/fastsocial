"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useTemplates } from "@/hooks/useTemplates";

export default function OnboardingTemplatesPage(): JSX.Element {
  const router = useRouter();
  const { data: templates, isLoading } = useTemplates("system");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  function toggle(id: string): void {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  }

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      <div>
        <h1 className="text-xl font-semibold">Escolha seus templates iniciais</h1>
        <p className="mt-1 text-sm text-neutral-600">
          Selecione um ou mais templates prontos para começar — você pode ajustar as zonas depois, a
          qualquer momento, no acervo de templates.
        </p>
      </div>

      {isLoading && <p className="text-sm text-neutral-600">Carregando...</p>}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {templates?.map((template) => {
          const selected = selectedIds.includes(template.id);
          return (
            <Card
              key={template.id}
              className={cn(
                "cursor-pointer space-y-2 p-3 transition-shadow hover:shadow-md",
                selected && "border-primary ring-1 ring-primary",
              )}
              onClick={() => toggle(template.id)}
            >
              <div className="flex aspect-square items-center justify-center overflow-hidden rounded-md bg-neutral-100">
                {template.previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={template.previewUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-xs text-neutral-400">Sem preview</span>
                )}
              </div>
              <span className="text-xs text-neutral-600">
                {template.format === "carousel" ? "Carrossel" : "Post"}
              </span>
            </Card>
          );
        })}
      </div>

      <div className="flex justify-end">
        <Button onClick={() => router.push("/dashboard")} disabled={selectedIds.length === 0}>
          Continuar ({selectedIds.length} selecionado{selectedIds.length === 1 ? "" : "s"})
        </Button>
      </div>
    </main>
  );
}
