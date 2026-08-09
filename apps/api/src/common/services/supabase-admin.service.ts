import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

// Cliente REST fino para a Admin API do GoTrue (Supabase Auth self-hospedado) —
// usado só para operações administrativas (convite de usuário, exclusão de conta).
// Deliberadamente NÃO usa o SDK @supabase/supabase-js completo aqui: a versão atual
// instancia um RealtimeClient internamente mesmo sem uso, o que quebra em Node 20
// por falta de WebSocket nativo (exigiria depender do pacote "ws" só por isso).
// Um cliente REST direto evita essa dependência para um caso de uso puramente admin.
@Injectable()
export class SupabaseAdminService {
  private readonly baseUrl: string;
  private readonly serviceRoleKey: string;

  constructor(config: ConfigService) {
    this.baseUrl = config.getOrThrow<string>("SUPABASE_URL");
    this.serviceRoleKey = config.getOrThrow<string>("SUPABASE_SERVICE_ROLE_KEY");
  }

  private headers(): Record<string, string> {
    return {
      apikey: this.serviceRoleKey,
      Authorization: `Bearer ${this.serviceRoleKey}`,
      "Content-Type": "application/json",
    };
  }

  async inviteUserByEmail(
    email: string,
    options?: { redirectTo?: string; data?: Record<string, unknown> },
  ): Promise<{ id: string; email: string } | { alreadyExists: true }> {
    const res = await fetch(`${this.baseUrl}/auth/v1/invite`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({
        email,
        data: options?.data,
        redirect_to: options?.redirectTo,
      }),
    });

    if (res.status === 422 || res.status === 400) {
      return { alreadyExists: true };
    }
    if (!res.ok) {
      throw new Error(`Falha ao convidar usuário via GoTrue Admin API: ${res.status} ${await res.text()}`);
    }
    const body = (await res.json()) as { id: string; email: string };
    return body;
  }

  async deleteUser(userId: string): Promise<void> {
    const res = await fetch(`${this.baseUrl}/auth/v1/admin/users/${userId}`, {
      method: "DELETE",
      headers: this.headers(),
    });
    if (!res.ok) {
      throw new Error(`Falha ao excluir usuário via GoTrue Admin API: ${res.status} ${await res.text()}`);
    }
  }
}
