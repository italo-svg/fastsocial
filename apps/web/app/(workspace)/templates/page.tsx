"use client";

import { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useTemplates } from "@/hooks/useTemplates";

export default function TemplatesPage(): JSX.Element {
  const [source, setSource] = useState<"system" | "own">("own");
  const [format, setFormat] = useState<string>("");
  const { data: templates, isLoading } = useTemplates(source, format || undefined);

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Acervo de templates</h1>
        <Link href="/templates/import">
          <Button>Importar template</Button>
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-lg border border-neutral-200 p-1">
          <button
            type="button"
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              source === "system" && "bg-primary text-white",
            )}
            onClick={() => setSource("system")}
          >
            Sistema
          </button>
          <button
            type="button"
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              source === "own" && "bg-primary text-white",
            )}
            onClick={() => setSource("own")}
          >
            Seus templates
          </button>
        </div>

        <select
          value={format}
          onChange={(e) => setFormat(e.target.value)}
          className="h-9 rounded-lg border border-neutral-200 bg-white px-3 text-sm text-neutral-900 outline-none"
        >
          <option value="">Todos os formatos</option>
          <option value="static_post">Post</option>
          <option value="carousel">Carrossel</option>
        </select>
      </div>

      {isLoading && <p className="text-sm text-neutral-600">Carregando...</p>}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
        {templates?.map((template) => (
          <Link key={template.id} href={`/templates/${template.id}/edit`}>
            <Card className="space-y-2 p-3 transition-shadow hover:shadow-md">
              <div className="flex aspect-square items-center justify-center overflow-hidden rounded-md bg-neutral-100">
                {template.previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={template.previewUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-xs text-neutral-400">Sem preview</span>
                )}
              </div>
              <div className="flex items-center justify-between">
                <Badge variant={template.isSystemTemplate ? "neutral" : "success"}>
                  {template.isSystemTemplate ? "Sistema" : "Seu"}
                </Badge>
                <span className="text-xs text-neutral-600">
                  {template.format === "carousel" ? "Carrossel" : "Post"}
                </span>
              </div>
            </Card>
          </Link>
        ))}
      </div>

      {templates?.length === 0 && !isLoading && (
        <p className="text-sm text-neutral-600">Nenhum template encontrado.</p>
      )}
    </main>
  );
}
