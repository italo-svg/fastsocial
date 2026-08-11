"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

function traduzErro(message: string): string {
  if (message.includes("session")) return "Este link expirou ou já foi usado. Peça um novo link de recuperação.";
  if (message.includes("Password")) return "A senha precisa ter pelo menos 8 caracteres.";
  return "Não foi possível redefinir sua senha. Tente pedir um novo link.";
}

function ResetPasswordPageInner(): JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [checkingLink, setCheckingLink] = useState(true);
  const [linkValid, setLinkValid] = useState(false);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Link de recuperação do Supabase chega com "code" na query string (fluxo
    // PKCE, mesmo mecanismo do callback do Google/confirmação de e-mail) —
    // troca por sessão real antes de deixar o usuário definir a nova senha.
    async function exchangeCode(): Promise<void> {
      const code = searchParams.get("code");
      const supabase = createClient();
      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        setLinkValid(!exchangeError);
      } else {
        const { data } = await supabase.auth.getSession();
        setLinkValid(!!data.session);
      }
      setCheckingLink(false);
    }
    void exchangeCode();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (updateError) {
      setError(traduzErro(updateError.message));
      return;
    }
    router.push("/dashboard");
  }

  if (checkingLink) {
    return (
      <main className="flex min-h-screen items-center justify-center p-8">
        <p className="text-sm text-neutral-600">Verificando link...</p>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <Card className="w-full max-w-sm space-y-4">
        <h1 className="text-xl font-semibold">Definir nova senha</h1>

        {!linkValid ? (
          <>
            <p className="text-sm text-danger">
              Este link de recuperação expirou ou é inválido. Peça um novo link para redefinir sua senha.
            </p>
            <a href="/forgot-password" className="text-sm text-primary">
              Pedir novo link
            </a>
          </>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <Input
              type="password"
              placeholder="Nova senha (mín. 8 caracteres)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              required
            />
            {error && <p className="text-sm text-danger">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Salvando..." : "Salvar nova senha"}
            </Button>
          </form>
        )}
      </Card>
    </main>
  );
}

export default function ResetPasswordPage(): JSX.Element {
  return (
    <Suspense fallback={<main className="p-8 text-sm text-neutral-600">Carregando...</main>}>
      <ResetPasswordPageInner />
    </Suspense>
  );
}
