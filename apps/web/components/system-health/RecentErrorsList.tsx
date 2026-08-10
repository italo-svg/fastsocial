import { Card } from "@/components/ui/card";

const GLITCHTIP_URL = process.env.NEXT_PUBLIC_GLITCHTIP_URL ?? "https://glitchtip.fastsocial.volupia.cloud";

// Link direto pro GlitchTip real em vez de embutir os erros aqui — puxar a
// lista via API do GlitchTip exigiria guardar um API token dele no frontend
// (nunca deve ficar no browser) ou proxied pelo backend, o que este spec não
// pede explicitamente; o link direto (mesmo padrão do QueueBacklogWidget pro
// Bull Board) já resolve "não precisar entrar em cada ferramenta separada" —
// o Super Admin sai daqui já autenticado com a própria conta do GlitchTip.
export function RecentErrorsList(): JSX.Element {
  return (
    <Card className="space-y-2">
      <h3 className="text-sm font-medium">Erros recentes</h3>
      <p className="text-xs text-neutral-500">Exceções não tratadas capturadas pelo GlitchTip.</p>
      <a
        href={GLITCHTIP_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm font-medium text-primary underline"
      >
        Abrir GlitchTip →
      </a>
    </Card>
  );
}
