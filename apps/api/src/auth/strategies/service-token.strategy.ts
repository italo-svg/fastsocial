import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { timingSafeEqual } from "node:crypto";

export interface ServiceTokenPayload {
  type: "service";
}

// Autenticação de SERVIÇO (spec 032) — separada do JWT de usuário humano
// (SupabaseJwtStrategy). Usada pelos workflows do n8n para chamar de volta a
// nossa API sem que exista um "usuário logado" no contexto de uma automação.
// NUNCA deve ser aceita nas mesmas rotas que esperam workspace_id resolvido
// via X-Workspace-Id (WorkspaceGuard) — quem usa este guard deve receber o
// workspace_id explicitamente no body/query de cada chamada, como qualquer
// requisição de um processo automatizado sem sessão.
//
// Implementado como validador simples (não uma Passport Strategy de verdade)
// consumido por ServiceTokenGuard — mesmo padrão de WorkspaceGuard/RolesGuard
// já usado no projeto. Chegou a ser prototipado com passport-custom, mas o
// pacote bundla tipos de @types/express incompatíveis com a versão do
// projeto (erro de build real, TS2416); evitar mais uma dependência para um
// simples compare-and-return não perde nada.
@Injectable()
export class ServiceTokenStrategy {
  constructor(private readonly config: ConfigService) {}

  validate(token: string | undefined): ServiceTokenPayload | null {
    const expected = this.config.get<string>("N8N_SERVICE_TOKEN");
    if (!token || !expected || !constantTimeEquals(token, expected)) {
      return null;
    }
    return { type: "service" };
  }
}

function constantTimeEquals(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}
