import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { Strategy } from "passport-custom";
import { timingSafeEqual } from "node:crypto";
import type { Request } from "express";

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
@Injectable()
export class ServiceTokenStrategy extends PassportStrategy(Strategy, "service-token") {
  constructor(private readonly config: ConfigService) {
    super();
  }

  validate(req: Request): ServiceTokenPayload {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;
    const expected = this.config.get<string>("N8N_SERVICE_TOKEN");

    if (!token || !expected || !constantTimeEquals(token, expected)) {
      throw new UnauthorizedException("Token de serviço inválido ou ausente.");
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
