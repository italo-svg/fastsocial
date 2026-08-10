"use client";

import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { usePublishedChangelog } from "@/hooks/useHelpCenter";

const TAG_VARIANT: Record<string, "success" | "warning" | "danger" | "neutral"> = {
  feature: "success",
  improvement: "neutral",
  fix: "warning",
  breaking: "danger",
};

export default function ChangelogPage(): JSX.Element {
  const { data: entries, isLoading, isError } = usePublishedChangelog();

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Novidades</h1>
        <p className="mt-1 text-sm text-neutral-600">
          O que mudou no FastSocial.{" "}
          <Link href="/help" className="underline">
            ← Central de Ajuda
          </Link>
        </p>
      </div>

      {isLoading && <p className="text-sm text-neutral-600">Carregando...</p>}
      {isError && <p className="text-sm text-danger">Não foi possível carregar o changelog.</p>}
      {entries?.length === 0 && <p className="text-sm text-neutral-600">Nenhuma novidade publicada ainda.</p>}

      <div className="space-y-4">
        {entries?.map((entry) => (
          <Card key={entry.id} className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant={TAG_VARIANT[entry.tag] ?? "neutral"}>{entry.tag}</Badge>
              <span className="text-xs text-neutral-500">
                {entry.publishedAt ? new Date(entry.publishedAt).toLocaleDateString("pt-BR") : ""}
              </span>
            </div>
            <h2 className="text-lg font-semibold">{entry.title}</h2>
            <div className="markdown-content text-sm">
              <ReactMarkdown>{entry.bodyMarkdown}</ReactMarkdown>
            </div>
          </Card>
        ))}
      </div>
    </main>
  );
}
