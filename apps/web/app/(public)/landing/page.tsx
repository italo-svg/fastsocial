import { Button } from "@/components/ui/button";

export default function LandingPage(): JSX.Element {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8 text-center">
      <h1 className="text-4xl font-bold">FastSocial</h1>
      <p className="max-w-md text-neutral-600">
        Pesquisa, copy, carrosséis e agendamento no piloto automático — fiel à sua marca.
      </p>
      <Button size="lg">Começar agora</Button>
    </main>
  );
}
