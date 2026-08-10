"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { usePublishedArticle } from "@/hooks/useHelpCenter";

export default function HelpArticlePage(): JSX.Element {
  const params = useParams<{ slug: string }>();
  const { data: article, isLoading, isError } = usePublishedArticle(params.slug);

  return (
    <main className="mx-auto max-w-3xl space-y-4 p-6">
      <Link href="/help" className="text-xs text-neutral-500 underline">
        ← Central de Ajuda
      </Link>

      {isLoading && <p className="text-sm text-neutral-600">Carregando...</p>}
      {isError && <p className="text-sm text-danger">Artigo não encontrado.</p>}

      {article && (
        <article className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{article.category}</span>
          <h1 className="text-2xl font-bold">{article.title}</h1>
          <div className="markdown-content pt-4">
            <ReactMarkdown>{article.contentMarkdown}</ReactMarkdown>
          </div>
        </article>
      )}
    </main>
  );
}
