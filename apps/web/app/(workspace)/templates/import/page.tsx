"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useImportTemplate } from "@/hooks/useTemplates";

export default function ImportTemplatePage(): JSX.Element {
  const router = useRouter();
  const importTemplate = useImportTemplate();
  const [files, setFiles] = useState<File[]>([]);
  const [source, setSource] = useState<"canva_import" | "gamma_import">("canva_import");
  const [error, setError] = useState<string | null>(null);

  function handleFiles(e: React.ChangeEvent<HTMLInputElement>): void {
    setFiles(Array.from(e.target.files ?? []));
    setError(null);
  }

  function handleImport(): void {
    if (files.length === 0) {
      setError("Selecione um arquivo PDF ou imagens.");
      return;
    }
    setError(null);
    importTemplate.mutate(
      { files, source },
      {
        onSuccess: (template) => router.push(`/templates/${template.id}/edit`),
        onError: () =>
          setError("Não foi possível importar o arquivo. Verifique o formato e tente novamente."),
      },
    );
  }

  return (
    <main className="mx-auto max-w-lg space-y-6 p-6">
      <h1 className="text-xl font-semibold">Importar template</h1>
      <Card className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Origem</label>
          <select
            value={source}
            onChange={(e) => setSource(e.target.value as "canva_import" | "gamma_import")}
            className="h-10 w-full rounded-lg border border-neutral-200 bg-white px-3 text-sm text-neutral-900 outline-none"
          >
            <option value="canva_import">Canva</option>
            <option value="gamma_import">Gamma</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Arquivo (PDF ou imagens PNG/JPG)</label>
          <input
            type="file"
            accept="application/pdf,image/png,image/jpeg"
            multiple
            onChange={handleFiles}
            className="block w-full text-sm"
          />
          <p className="text-xs text-neutral-600">
            Um PDF de 1 página vira um post; múltiplas páginas ou imagens viram um carrossel (até 10
            slides).
          </p>
        </div>

        {files.length > 0 && (
          <p className="text-sm text-neutral-600">{files.length} arquivo(s) selecionado(s).</p>
        )}
        {error && <p className="text-sm text-danger">{error}</p>}

        <Button onClick={handleImport} disabled={importTemplate.isPending} className="w-full">
          {importTemplate.isPending ? "Importando..." : "Importar"}
        </Button>
      </Card>
    </main>
  );
}
