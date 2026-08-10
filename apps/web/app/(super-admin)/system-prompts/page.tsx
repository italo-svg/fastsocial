"use client";

import Link from "next/link";
import { Card } from "@/components/ui/card";
import { useAuthMe } from "@/hooks/useAuthMe";
import { useSystemPrompts } from "@/hooks/useSystemPrompts";

const PROMPT_LABELS: Record<string, string> = {
  copy_generation_static_post: "Copy — Post estático",
  copy_generation_carousel: "Copy — Carrossel",
  copy_generation_reels_script: "Copy — Roteiro de Reels",
  scene_director: "Diretor de Cena (imagem)",
  qa_vision: "QA de Visão (imagem)",
  image_negative_list: "Imagem — Lista de exclusão",
  image_brand_identity_lock_template: "Imagem — Identidade de marca",
  image_slot_constraint: "Imagem — Restrição de slot",
};

export default function SystemPromptsPage(): JSX.Element {
  const { data: authMe, isLoading: isLoadingAuth } = useAuthMe();
  const { data: prompts, isLoading, isError } = useSystemPrompts();

  if (isLoadingAuth) {
    return (
      <main className="mx-auto max-w-4xl p-6">
        <p className="text-sm text-neutral-600">Carregando...</p>
      </main>
    );
  }

  // CA-04 (spec 048, reforçado aqui): mesma checagem de UX do resto do painel super admin.
  if (!authMe?.user.isPlatformSuperAdmin) {
    return (
      <main className="mx-auto max-w-4xl p-6">
        <p className="text-sm text-danger">Acesso restrito ao super admin da plataforma.</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl space-y-6 p-6">
      <div>
        <h1 className="text-xl font-semibold">Prompts do Sistema</h1>
        <p className="mt-1 text-sm text-neutral-600">
          Edite os prompts base da IA sem depender de deploy — cada edição vira uma nova versão, nunca sobrescreve.
        </p>
      </div>

      {isLoading && <p className="text-sm text-neutral-600">Carregando...</p>}
      {isError && <p className="text-sm text-danger">Não foi possível carregar os prompts.</p>}

      <div className="space-y-2">
        {prompts?.map((prompt) => (
          <Link key={prompt.promptKey} href={`/system-prompts/${prompt.promptKey}`}>
            <Card className="flex items-center justify-between transition-shadow hover:shadow-md">
              <div>
                <h3 className="text-sm font-medium">{PROMPT_LABELS[prompt.promptKey] ?? prompt.promptKey}</h3>
                <p className="mt-1 truncate text-xs text-neutral-500">{prompt.content.slice(0, 100)}</p>
              </div>
              <span className="shrink-0 text-xs text-neutral-500">
                {prompt.currentVersion > 0 ? `v${prompt.currentVersion}` : "não editado ainda"}
              </span>
            </Card>
          </Link>
        ))}
      </div>
    </main>
  );
}
