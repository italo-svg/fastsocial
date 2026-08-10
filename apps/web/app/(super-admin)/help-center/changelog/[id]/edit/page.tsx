"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuthMe } from "@/hooks/useAuthMe";
import { useAdminChangelogEntry, useDeleteChangelogEntry, useUpdateChangelogEntry } from "@/hooks/useHelpCenter";

export default function EditChangelogEntryPage(): JSX.Element {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { data: authMe, isLoading: isLoadingAuth } = useAuthMe();
  const { data: entry, isLoading, isError } = useAdminChangelogEntry(params.id);
  const updateEntry = useUpdateChangelogEntry(params.id);
  const deleteEntry = useDeleteChangelogEntry();

  const [title, setTitle] = useState("");
  const [tag, setTag] = useState("");
  const [bodyMarkdown, setBodyMarkdown] = useState("");
  const [isPublished, setIsPublished] = useState(false);

  useEffect(() => {
    if (entry) {
      setTitle(entry.title);
      setTag(entry.tag);
      setBodyMarkdown(entry.bodyMarkdown);
      setIsPublished(!!entry.publishedAt);
    }
  }, [entry]);

  if (isLoadingAuth) return <main className="p-6 text-sm text-neutral-600">Carregando...</main>;
  if (!authMe?.user.isPlatformSuperAdmin) {
    return (
      <main className="mx-auto max-w-4xl p-6">
        <p className="text-sm text-danger">Acesso restrito ao super admin da plataforma.</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6">
      <Link href="/help-center" className="text-xs text-neutral-500 underline">
        ← Gestão da Central de Ajuda
      </Link>

      {isLoading && <p className="text-sm text-neutral-600">Carregando...</p>}
      {isError && <p className="text-sm text-danger">Entrada não encontrada.</p>}

      {entry && (
        <>
          <Card className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Input placeholder="Título" value={title} onChange={(e) => setTitle(e.target.value)} />
              <Input placeholder="Tag (feature/improvement/fix/breaking)" value={tag} onChange={(e) => setTag(e.target.value)} />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={isPublished} onChange={(e) => setIsPublished(e.target.checked)} />
              Publicado (visível em /changelog)
            </label>
          </Card>

          <div className="grid grid-cols-2 gap-4">
            <Card className="space-y-2">
              <h3 className="text-sm font-semibold">Conteúdo (markdown)</h3>
              <Textarea rows={12} value={bodyMarkdown} onChange={(e) => setBodyMarkdown(e.target.value)} />
            </Card>
            <Card className="space-y-2">
              <h3 className="text-sm font-semibold">Preview</h3>
              <div className="markdown-content">
                <ReactMarkdown>{bodyMarkdown || "*Sem conteúdo ainda.*"}</ReactMarkdown>
              </div>
            </Card>
          </div>

          <div className="flex items-center gap-3">
            <Button
              type="button"
              disabled={updateEntry.isPending}
              onClick={() =>
                updateEntry.mutate(
                  { title, tag, bodyMarkdown, publishedAt: isPublished ? entry.publishedAt ?? new Date().toISOString() : null },
                  { onSuccess: () => router.push("/help-center") },
                )
              }
            >
              {updateEntry.isPending ? "Salvando..." : "Salvar"}
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => deleteEntry.mutate(entry.id, { onSuccess: () => router.push("/help-center") })}
            >
              Excluir
            </Button>
          </div>
        </>
      )}
    </main>
  );
}
