import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { randomBytes } from "node:crypto";
import { PrismaService } from "../../prisma/prisma.service";
import { TokenEncryptionService } from "../../common/services/token-encryption.service";

// CAMINHO B (spec 029): o Postiz reusado (spec 027) não tem suporte confiável
// a post de documento/PDF no LinkedIn via API pública (achado documentado em
// infra/postiz/README.md, citando gitroomhq/postiz-app#1381) — então este
// módulo fala DIRETO com a API do LinkedIn, sem passar pelo Postiz.
// Consequência: ao contrário do Meta (spec 028, custodiado pelo Postiz), aqui
// o FastSocial guarda o access_token/refresh_token do LinkedIn cifrados em
// `social_accounts` (AES-256-GCM via TokenEncryptionService) — não há Postiz
// por trás para custodiar. `state` do OAuth é assinado com HMAC usando a
// mesma TOKEN_ENCRYPTION_KEY, para o callback (rota pública, sem JWT do
// FastSocial) confirmar de qual workspace veio o clique sem depender de sessão.
const AUTHORIZATION_URL = "https://www.linkedin.com/oauth/v2/authorization";
const TOKEN_URL = "https://www.linkedin.com/oauth/v2/accessToken";
const API_BASE = "https://api.linkedin.com";
const SCOPES = ["w_organization_social", "r_organization_social", "rw_organization_admin"];
const STATE_TTL_MS = 10 * 60 * 1000;

export interface LinkedInOrganization {
  id: string;
  name: string;
}

@Injectable()
export class LinkedInOAuthService {
  private readonly logger = new Logger(LinkedInOAuthService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly tokenEncryption: TokenEncryptionService,
  ) {}

  isConfigured(): boolean {
    return (
      !!this.config.get<string>("LINKEDIN_CLIENT_ID") &&
      !!this.config.get<string>("LINKEDIN_CLIENT_SECRET") &&
      this.tokenEncryption.isConfigured()
    );
  }

  private get clientId(): string {
    return this.config.get<string>("LINKEDIN_CLIENT_ID")!;
  }

  private get clientSecret(): string {
    return this.config.get<string>("LINKEDIN_CLIENT_SECRET")!;
  }

  private get linkedInApiVersion(): string {
    return this.config.get<string>("LINKEDIN_API_VERSION") ?? "202501";
  }

  private get redirectUri(): string {
    const apiPublicUrl = this.config.get<string>("API_PUBLIC_URL");
    if (!apiPublicUrl) {
      throw new Error("API_PUBLIC_URL não configurada (necessária para o callback do LinkedIn).");
    }
    return `${apiPublicUrl}/api/v1/social-accounts/connect/linkedin/callback`;
  }

  private signState(workspaceId: string): string {
    const nonce = randomBytes(8).toString("hex");
    const expiresAt = Date.now() + STATE_TTL_MS;
    const payload = `${workspaceId}.${expiresAt}.${nonce}`;
    const signature = this.tokenEncryption.hmac(payload);
    return Buffer.from(`${payload}.${signature}`).toString("base64url");
  }

  private verifyState(state: string): { workspaceId: string } {
    const decoded = Buffer.from(state, "base64url").toString("utf8");
    const [workspaceId, expiresAtRaw, nonce, signature] = decoded.split(".");
    if (!workspaceId || !expiresAtRaw || !nonce || !signature) {
      throw new Error("Parâmetro state do LinkedIn OAuth inválido.");
    }
    const payload = `${workspaceId}.${expiresAtRaw}.${nonce}`;
    const expectedSignature = this.tokenEncryption.hmac(payload);
    if (signature !== expectedSignature) {
      throw new Error("Assinatura do state do LinkedIn OAuth não confere (possível adulteração).");
    }
    if (Date.now() > Number(expiresAtRaw)) {
      throw new Error("State do LinkedIn OAuth expirado — reinicie a conexão.");
    }
    return { workspaceId };
  }

  buildAuthorizationUrl(workspaceId: string): string {
    const params = new URLSearchParams({
      response_type: "code",
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      state: this.signState(workspaceId),
      scope: SCOPES.join(" "),
    });
    return `${AUTHORIZATION_URL}?${params.toString()}`;
  }

  private async exchangeCodeForToken(code: string): Promise<{
    accessToken: string;
    refreshToken?: string;
    expiresInSeconds: number;
  }> {
    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: this.redirectUri,
      client_id: this.clientId,
      client_secret: this.clientSecret,
    });
    const res = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });
    if (!res.ok) {
      throw new Error(`Falha ao trocar code por token no LinkedIn: ${res.status} ${await res.text()}`);
    }
    const json = (await res.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in: number;
    };
    return { accessToken: json.access_token, refreshToken: json.refresh_token, expiresInSeconds: json.expires_in };
  }

  // Busca a primeira Company Page em que o usuário logado é ADMINISTRATOR
  // aprovado. Se o cliente administra múltiplas páginas, o fluxo atual conecta
  // só a primeira — selecionar entre várias fica para uma iteração futura da
  // UI de conexões (spec 031), não fazia parte dos CAs deste spec.
  private async fetchAdministeredOrganization(accessToken: string): Promise<LinkedInOrganization> {
    const aclsRes = await fetch(
      `${API_BASE}/v2/organizationAcls?q=roleAssignee&role=ADMINISTRATOR&state=APPROVED`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "LinkedIn-Version": this.linkedInApiVersion,
          "X-Restli-Protocol-Version": "2.0.0",
        },
      },
    );
    if (!aclsRes.ok) {
      throw new Error(`Falha ao listar Company Pages administradas: ${aclsRes.status} ${await aclsRes.text()}`);
    }
    const aclsJson = (await aclsRes.json()) as { elements: { organization: string }[] };
    const organizationUrn = aclsJson.elements[0]?.organization;
    if (!organizationUrn) {
      throw new Error("Nenhuma Company Page administrada encontrada para este usuário do LinkedIn.");
    }
    const organizationId = organizationUrn.split(":").pop()!;

    const orgRes = await fetch(`${API_BASE}/v2/organizations/${organizationId}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "LinkedIn-Version": this.linkedInApiVersion,
        "X-Restli-Protocol-Version": "2.0.0",
      },
    });
    if (!orgRes.ok) {
      throw new Error(`Falha ao buscar detalhes da Company Page: ${orgRes.status} ${await orgRes.text()}`);
    }
    const orgJson = (await orgRes.json()) as { localizedName: string };
    return { id: organizationId, name: orgJson.localizedName };
  }

  async handleCallback(code: string, state: string): Promise<{ workspaceId: string; organizationName: string }> {
    const { workspaceId } = this.verifyState(state);
    const { accessToken, refreshToken, expiresInSeconds } = await this.exchangeCodeForToken(code);
    const organization = await this.fetchAdministeredOrganization(accessToken);

    await this.prisma.socialAccount.upsert({
      where: {
        workspaceId_network_externalAccountId: {
          workspaceId,
          network: "linkedin",
          externalAccountId: organization.id,
        },
      },
      create: {
        workspaceId,
        network: "linkedin",
        externalAccountId: organization.id,
        displayName: organization.name,
        accessTokenEncrypted: this.tokenEncryption.encrypt(accessToken),
        refreshTokenEncrypted: refreshToken ? this.tokenEncryption.encrypt(refreshToken) : null,
        tokenExpiresAt: new Date(Date.now() + expiresInSeconds * 1000),
        status: "connected",
      },
      update: {
        displayName: organization.name,
        accessTokenEncrypted: this.tokenEncryption.encrypt(accessToken),
        refreshTokenEncrypted: refreshToken ? this.tokenEncryption.encrypt(refreshToken) : null,
        tokenExpiresAt: new Date(Date.now() + expiresInSeconds * 1000),
        status: "connected",
      },
    });

    this.logger.log(`Company Page "${organization.name}" conectada ao workspace ${workspaceId} via LinkedIn OAuth.`);
    return { workspaceId, organizationName: organization.name };
  }

  // CA-05: renovação proativa. O LinkedIn só emite refresh_token para apps com
  // "Programmatic Refresh Tokens" aprovado — sem isso, refreshToken fica nulo
  // e a conta precisa ser reconectada manualmente ao expirar (comportamento
  // documentado, não um bug). Ver LinkedInTokenRefreshJob para o agendamento.
  async refreshAccessToken(socialAccountId: string): Promise<void> {
    const account = await this.prisma.socialAccount.findUniqueOrThrow({ where: { id: socialAccountId } });
    if (!account.refreshTokenEncrypted) {
      this.logger.warn(
        `Conta LinkedIn ${account.id} sem refresh_token — não é possível renovar automaticamente. Marcando como expirada.`,
      );
      await this.prisma.socialAccount.update({ where: { id: account.id }, data: { status: "expired" } });
      return;
    }

    const refreshToken = this.tokenEncryption.decrypt(account.refreshTokenEncrypted);
    const body = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: this.clientId,
      client_secret: this.clientSecret,
    });
    const res = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });
    if (!res.ok) {
      this.logger.error(`Falha ao renovar token LinkedIn da conta ${account.id}: ${res.status} ${await res.text()}`);
      await this.prisma.socialAccount.update({ where: { id: account.id }, data: { status: "expired" } });
      return;
    }
    const json = (await res.json()) as { access_token: string; refresh_token?: string; expires_in: number };

    await this.prisma.socialAccount.update({
      where: { id: account.id },
      data: {
        accessTokenEncrypted: this.tokenEncryption.encrypt(json.access_token),
        refreshTokenEncrypted: json.refresh_token
          ? this.tokenEncryption.encrypt(json.refresh_token)
          : account.refreshTokenEncrypted,
        tokenExpiresAt: new Date(Date.now() + json.expires_in * 1000),
        status: "connected",
      },
    });
    this.logger.log(`Token LinkedIn da conta ${account.id} renovado com sucesso.`);
  }
}
