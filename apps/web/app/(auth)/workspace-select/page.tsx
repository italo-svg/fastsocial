"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthMe } from "@/hooks/useAuthMe";
import { useAuthStore } from "@/stores/auth.store";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function WorkspaceSelectPage(): JSX.Element {
  const router = useRouter();
  const setActiveWorkspace = useAuthStore((s) => s.setActiveWorkspace);
  const { data, isLoading, error } = useAuthMe();

  useEffect(() => {
    if (data?.workspaces.length === 1) {
      setActiveWorkspace(data.workspaces[0]!.id);
      router.push("/dashboard");
    }
  }, [data, router, setActiveWorkspace]);

  if (isLoading) {
    return <main className="p-8">Carregando...</main>;
  }

  if (error) {
    return <main className="p-8 text-danger">Não foi possível carregar seus workspaces.</main>;
  }

  if (!data || data.workspaces.length === 0) {
    return (
      <main className="flex min-h-screen items-center justify-center p-8">
        <Card className="max-w-sm text-center space-y-3">
          <p>Você ainda não tem nenhum workspace.</p>
          <Button onClick={() => router.push("/onboarding/create")}>Criar meu workspace</Button>
        </Card>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <Card className="w-full max-w-sm space-y-3">
        <h1 className="text-xl font-semibold">Escolha um workspace</h1>
        {data.workspaces.map((ws) => (
          <Button
            key={ws.id}
            variant="secondary"
            className="w-full justify-between"
            onClick={() => {
              setActiveWorkspace(ws.id);
              router.push("/dashboard");
            }}
          >
            {ws.name}
          </Button>
        ))}
      </Card>
    </main>
  );
}
