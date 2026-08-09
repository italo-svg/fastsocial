"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth.store";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface CreatedWorkspace {
  id: string;
  name: string;
}

export default function CreateWorkspacePage(): JSX.Element {
  const router = useRouter();
  const setActiveWorkspace = useAuthStore((s) => s.setActiveWorkspace);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleCreate(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const workspace = await apiFetch<CreatedWorkspace>("/workspaces", {
        method: "POST",
        body: JSON.stringify({ name }),
      });
      setActiveWorkspace(workspace.id);
      router.push("/onboarding/brand");
    } catch {
      setError("Não foi possível criar o workspace. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <Card className="w-full max-w-sm space-y-4">
        <h1 className="text-xl font-semibold">Nome do seu workspace</h1>
        <form onSubmit={handleCreate} className="space-y-3">
          <Input
            placeholder="Ex: Minha Marca"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Criando..." : "Criar workspace"}
          </Button>
        </form>
      </Card>
    </main>
  );
}
