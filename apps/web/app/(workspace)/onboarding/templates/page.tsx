import { Card } from "@/components/ui/card";

// Conteudo real desta tela (selecao de templates iniciais) e implementado no spec 014.
export default function OnboardingTemplatesPage(): JSX.Element {
  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-50 p-6">
      <Card className="w-full max-w-lg text-center">
        <h1 className="text-lg font-semibold text-neutral-900">Brand kit configurado!</h1>
        <p className="mt-2 text-sm text-neutral-600">
          A seleção de templates iniciais estará disponível em breve.
        </p>
      </Card>
    </main>
  );
}
