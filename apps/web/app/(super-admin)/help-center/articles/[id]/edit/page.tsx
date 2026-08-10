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
import { useAdminArticle, useDeleteArticle, useUpdateArticle } from "@/hooks/useHelpCenter";

export default function EditHelpArticlePage(): JSX.Element {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { data: authMe, isLoading: isLoadingAuth } = useAuthMe();
  const { data: article, isLoading, isError } = useAdminArticle(params.id);
  const updateArticle = useUpdateArticle(params.id);
  const deleteArticle = useDeleteArticle();

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [contentMarkdown, setContentMarkdown] = useState("");
  const [isPublished, setIsPublished] = useState(false);

  useEffect(() => {
    if (article) {
      setTitle(article.title);
      setCategory(article.category);
      setContentMarkdown(article.contentMarkdown);
      setIsPublished(article.isPublished);
    }
  }, [article]);

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
      {isError && <p className="text-sm text-danger">Artigo não encontrado.</p>}

      {article && (
        <>
          <Card className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Input placeholder="Título" value={title} onChange={(e) => setTitle(e.target.value)} />
              <Input placeholder="Categoria" value={category} onChange={(e) => setCategory(e.target.value)} />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={isPublished} onChange={(e) => setIsPublished(e.target.checked)} />
              Publicado (visível em /help)
            </label>
          </Card>

          {/* item 3 do spec: mesma lib (react-markdown) no editor e na renderização pública. */}
          <div className="grid grid-cols-2 gap-4">
            <Card className="space-y-2">
              <h3 className="text-sm font-semibold">Conteúdo (markdown)</h3>
              <Textarea rows={16} value={contentMarkdown} onChange={(e) => setContentMarkdown(e.target.value)} />
            </Card>
            <Card className="space-y-2">
              <h3 className="text-sm font-semibold">Preview</h3>
              <div className="markdown-content">
                <ReactMarkdown>{contentMarkdown || "*Sem conteúdo ainda.*"}</ReactMarkdown>
              </div>
            </Card>
          </div>

          <div className="flex items-center gap-3">
            <Button
              type="button"
              disabled={updateArticle.isPending}
              onClick={() =>
                updateArticle.mutate({ title, category, contentMarkdown, isPublished }, { onSuccess: () => router.push("/help-center") })
              }
            >
              {updateArticle.isPending ? "Salvando..." : "Salvar"}
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => deleteArticle.mutate(article.id, { onSuccess: () => router.push("/help-center") })}
            >
              Excluir
            </Button>
          </div>
        </>
      )}
    </main>
  );
}
