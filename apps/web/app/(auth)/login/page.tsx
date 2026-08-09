import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

// Logica real de login (Supabase Auth) entra no spec 008 — este e so o esqueleto visual.
export default function LoginPage(): JSX.Element {
  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <Card className="w-full max-w-sm space-y-4">
        <h1 className="text-xl font-semibold">Entrar</h1>
        <Input type="email" placeholder="E-mail" />
        <Input type="password" placeholder="Senha" />
        <Button className="w-full">Entrar</Button>
      </Card>
    </main>
  );
}
