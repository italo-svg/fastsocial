"use client";

import { useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthMe } from "@/hooks/useAuthMe";
import {
  useAdminArticles,
  useAdminChangelog,
  useCreateArticle,
  useCreateChangelogEntry,
  useDeleteArticle,
  useDeleteChangelogEntry,
} from "@/hooks/useHelpCenter";

export default function HelpCenterAdminPage(): JSX.Element {
  const { data: authMe, isLoading: isLoadingAuth } = useAuthMe();
  const { data: articles, isLoading: isLoadingArticles } = useAdminArticles();
  const { data: changelog, isLoading: isLoadingChangelog } = useAdminChangelog();
  const createArticle = useCreateArticle();
  const createChangelogEntry = useCreateChangelogEntry();
  const deleteArticle = useDeleteArticle();
  const deleteChangelogEntry = useDeleteChangelogEntry();

  const [newArticleTitle, setNewArticleTitle] = useState("");
  const [newChangelogTitle, setNewChangelogTitle] = useState("");

  if (isLoadingAuth) {
    return (
      <main className="mx-auto max-w-4xl p-6">
        <p className="text-sm text-neutral-600">Carregando...</p>
      </main>
    );
  }

  if (!authMe?.user.isPlatformSuperAdmin) {
    return (
      <main className="mx-auto max-w-4xl p-6">
        <p className="text-sm text-danger">Acesso restrito ao super admin da plataforma.</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl space-y-8 p-6">
      <div>
        <h1 className="text-xl font-semibold">Gestão da Central de Ajuda</h1>
        <p className="mt-1 text-sm text-neutral-600">Artigos e changelog visíveis publicamente em /help e /changelog.</p>
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Artigos</h2>
        </div>

        <Card className="flex items-center gap-2">
          <Input placeholder="Título do novo artigo..." value={newArticleTitle} onChange={(e) => setNewArticleTitle(e.target.value)} />
          <Button
            type="button"
            size="sm"
            disabled={!newArticleTitle.trim() || createArticle.isPending}
            onClick={() =>
              createArticle.mutate(
                { title: newArticleTitle, category: "geral", contentMarkdown: "", isPublished: false },
                { onSuccess: () => setNewArticleTitle("") },
              )
            }
          >
            + Novo artigo
          </Button>
        </Card>

        {isLoadingArticles && <p className="text-sm text-neutral-600">Carregando...</p>}
        <div className="space-y-2">
          {articles?.map((article) => (
            <Card key={article.id} className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium">{article.title}</h3>
                <div className="mt-1 flex items-center gap-2">
                  <Badge variant={article.isPublished ? "success" : "neutral"}>
                    {article.isPublished ? "Publicado" : "Rascunho"}
                  </Badge>
                  <span className="text-xs text-neutral-500">{article.category}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Link href={`/help-center/articles/${article.id}/edit`}>
                  <Button type="button" variant="secondary" size="sm">
                    Editar
                  </Button>
                </Link>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => deleteArticle.mutate(article.id)}
                >
                  Excluir
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Changelog</h2>

        <Card className="flex items-center gap-2">
          <Input
            placeholder="Título da nova entrada..."
            value={newChangelogTitle}
            onChange={(e) => setNewChangelogTitle(e.target.value)}
          />
          <Button
            type="button"
            size="sm"
            disabled={!newChangelogTitle.trim() || createChangelogEntry.isPending}
            onClick={() =>
              createChangelogEntry.mutate(
                { title: newChangelogTitle, bodyMarkdown: "", tag: "improvement" },
                { onSuccess: () => setNewChangelogTitle("") },
              )
            }
          >
            + Nova entrada
          </Button>
        </Card>

        {isLoadingChangelog && <p className="text-sm text-neutral-600">Carregando...</p>}
        <div className="space-y-2">
          {changelog?.map((entry) => (
            <Card key={entry.id} className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium">{entry.title}</h3>
                <div className="mt-1 flex items-center gap-2">
                  <Badge variant={entry.publishedAt ? "success" : "neutral"}>
                    {entry.publishedAt ? "Publicado" : "Rascunho"}
                  </Badge>
                  <span className="text-xs text-neutral-500">{entry.tag}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Link href={`/help-center/changelog/${entry.id}/edit`}>
                  <Button type="button" variant="secondary" size="sm">
                    Editar
                  </Button>
                </Link>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => deleteChangelogEntry.mutate(entry.id)}
                >
                  Excluir
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </section>
    </main>
  );
}
