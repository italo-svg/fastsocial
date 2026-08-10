import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { randomBytes, randomUUID } from "node:crypto";
import { Client } from "pg";

export interface PostizIntegration {
  id: string;
  name: string;
  picture?: string;
  providerIdentifier: string;
  disabled?: boolean;
}

const DEFAULT_POSTIZ_API_URL = "http://volupia_postiz:3000";

// Cliente para o Postiz self-hosted da agência, reaproveitado como motor de
// publicação do FastSocial (spec 027). Cada workspace FastSocial ganha sua
// própria Organization dentro desse Postiz compartilhado, isolada pela
// apiKey — o cliente final nunca acessa o Postiz diretamente.
@Injectable()
export class PostizClientService {
  private readonly logger = new Logger(PostizClientService.name);

  constructor(private readonly config: ConfigService) {}

  private get apiUrl(): string {
    return this.config.get<string>("POSTIZ_API_URL") ?? DEFAULT_POSTIZ_API_URL;
  }

  private get postizDatabaseUrl(): string | undefined {
    return this.config.get<string>("POSTIZ_DATABASE_URL");
  }

  async listIntegrations(apiKey: string): Promise<PostizIntegration[]> {
    const res = await fetch(`${this.apiUrl}/public/v1/integrations`, {
      headers: { Authorization: apiKey },
    });
    if (!res.ok) {
      throw new Error(`Falha ao listar integrações do Postiz: ${res.status} ${await res.text()}`);
    }
    return (await res.json()) as PostizIntegration[];
  }

  // Payload conforme a API pública v1 do Postiz (v2.11.3) — só /public/v1/integrations
  // foi validado ao vivo até agora (spec 027/028); este endpoint de criação de
  // post ainda não pôde ser exercitado contra uma integração real conectada,
  // porque conectar uma integração nova ainda é a lacuna aberta do spec 028.
  // Revisar o formato do payload assim que a primeira conta Instagram/Facebook
  // real estiver conectada e um post de teste puder confirmar o schema.
  async createPost(
    apiKey: string,
    params: { integrationId: string; content: string; mediaUrls: string[] },
  ): Promise<{ postId: string }> {
    const res = await fetch(`${this.apiUrl}/public/v1/posts`, {
      method: "POST",
      headers: { Authorization: apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "now",
        posts: [
          {
            integration: { id: params.integrationId },
            value: [{ content: params.content, media: params.mediaUrls }],
          },
        ],
      }),
    });
    if (!res.ok) {
      throw new Error(`Falha ao publicar post no Postiz: ${res.status} ${await res.text()}`);
    }
    const json = (await res.json()) as { id?: string; postId?: string };
    return { postId: json.postId ?? json.id ?? "" };
  }

  async disconnectIntegration(apiKey: string, integrationId: string): Promise<void> {
    const res = await fetch(`${this.apiUrl}/public/v1/integrations/${integrationId}`, {
      method: "DELETE",
      headers: { Authorization: apiKey },
    });
    if (!res.ok) {
      throw new Error(`Falha ao desconectar integração no Postiz: ${res.status} ${await res.text()}`);
    }
  }

  // Provisiona uma Organization do Postiz dedicada a um workspace FastSocial,
  // escrevendo direto no banco do Postiz — a API pública dele (v2.11.3) não
  // expõe criação de organização, só operações sobre integrações já conectadas
  // a uma organização existente. Fragilidade assumida conscientemente: depende
  // do schema interno do Postiz; revisar esta função se o Postiz for atualizado.
  async provisionOrganization(workspaceName: string): Promise<{ organizationId: string; apiKey: string }> {
    const dbUrl = this.postizDatabaseUrl;
    if (!dbUrl) {
      throw new Error("POSTIZ_DATABASE_URL não configurada.");
    }

    const client = new Client({ connectionString: dbUrl });
    await client.connect();
    try {
      const ownerResult = await client.query<{ id: string }>(
        'SELECT id FROM "User" ORDER BY "createdAt" ASC LIMIT 1',
      );
      const ownerId = ownerResult.rows[0]?.id;
      if (!ownerId) {
        throw new Error("Nenhum usuário encontrado no Postiz para vincular a nova organização.");
      }

      const organizationId = randomUUID();
      const apiKey = randomBytes(32).toString("hex");
      const now = new Date();

      await client.query(
        'INSERT INTO "Organization" (id, name, "apiKey", "createdAt", "updatedAt", "allowTrial", "isTrailing") VALUES ($1, $2, $3, $4, $4, false, false)',
        [organizationId, workspaceName, apiKey, now],
      );
      await client.query(
        'INSERT INTO "UserOrganization" (id, "userId", "organizationId", disabled, role, "createdAt", "updatedAt") VALUES ($1, $2, $3, false, $4, $5, $5)',
        [randomUUID(), ownerId, organizationId, "ADMIN", now],
      );

      this.logger.log(`Organization do Postiz provisionada para workspace "${workspaceName}" (${organizationId}).`);
      return { organizationId, apiKey };
    } finally {
      await client.end();
    }
  }
}
