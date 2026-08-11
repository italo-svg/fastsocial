"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function ForgotPasswordPage(): JSX.Element {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    // O Supabase sempre responde sucesso aqui, exista ou não o e-mail — não
    // dá pra distinguir os dois casos por design (evita enumeração de contas).
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (resetError) {
      setError("Não foi possível enviar o e-mail agora. Tente novamente em instantes.");
      return;
    }
    setSent(true);
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <Card className="w-full max-w-sm space-y-4">
        <h1 className="text-xl font-semibold">Recuperar senha</h1>

        {sent ? (
          <p className="text-sm text-neutral-600">
            Se <strong>{email}</strong> tiver uma conta no FastSocial, você vai receber um e-mail com um link
            para redefinir sua senha em instantes.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <p className="text-sm text-neutral-600">
              Informe o e-mail da sua conta — enviamos um link para você criar uma nova senha.
            </p>
            <Input
              type="email"
              placeholder="E-mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            {error && <p className="text-sm text-danger">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Enviando..." : "Enviar link de recuperação"}
            </Button>
          </form>
        )}

        <p className="text-center text-sm text-neutral-600">
          <a href="/login" className="text-primary">
            Voltar para o login
          </a>
        </p>
      </Card>
    </main>
  );
}
