"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { usePublishedArticles } from "@/hooks/useHelpCenter";

// Item 4 do spec: busca client-side sobre os resultados já paginados da API
// (volume baixo esperado, sem precisar de debounce complexo).
export default function HelpCenterPage(): JSX.Element {
  const { data: articles, isLoading, isError } = usePublishedArticles();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!articles) return [];
    const q = query.trim().toLowerCase();
    if (!q) return articles;
    return articles.filter(
      (a) => a.title.toLowerCase().includes(q) || a.contentMarkdown.toLowerCase().includes(q),
    );
  }, [articles, query]);

  const byCategory = useMemo(() => {
    const map = new Map<string, typeof filtered>();
    for (const article of filtered) {
      const list = map.get(article.category) ?? [];
      list.push(article);
      map.set(article.category, list);
    }
    return map;
  }, [filtered]);

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Central de Ajuda</h1>
        <p className="mt-1 text-sm text-neutral-600">
          Tudo que você precisa pra tirar o máximo do FastSocial.{" "}
          <Link href="/changelog" className="underline">
            Ver novidades →
          </Link>
        </p>
      </div>

      <Input
        type="search"
        placeholder="Buscar artigos..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {isLoading && <p className="text-sm text-neutral-600">Carregando...</p>}
      {isError && <p className="text-sm text-danger">Não foi possível carregar os artigos.</p>}

      {!isLoading && filtered.length === 0 && (
        <p className="text-sm text-neutral-600">Nenhum artigo encontrado{query ? ` para "${query}"` : ""}.</p>
      )}

      <div className="space-y-6">
        {Array.from(byCategory.entries()).map(([category, categoryArticles]) => (
          <div key={category} className="space-y-2">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{category}</h2>
            {categoryArticles.map((article) => (
              <Link key={article.id} href={`/help/${article.slug}`}>
                <Card className="transition-shadow hover:shadow-md">
                  <h3 className="text-sm font-medium">{article.title}</h3>
                  <p className="mt-1 truncate text-xs text-neutral-500">{article.contentMarkdown.slice(0, 100)}</p>
                </Card>
              </Link>
            ))}
          </div>
        ))}
      </div>
    </main>
  );
}
