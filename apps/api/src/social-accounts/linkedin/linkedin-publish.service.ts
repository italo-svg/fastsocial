import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../../prisma/prisma.service";
import { TokenEncryptionService } from "../../common/services/token-encryption.service";

const API_BASE = "https://api.linkedin.com";

interface LinkedInAccountContext {
  accessToken: string;
  organizationUrn: string;
}

// Publicação direta na API do LinkedIn (Caminho B — ver comentário no topo de
// linkedin-oauth.service.ts). Endpoints/versão conforme vigente no momento da
// implementação (LinkedIn-Version 202501); revisar contra a documentação
// atual da LinkedIn antes de habilitar em produção, como o próprio spec 029
// antecipa ("conforme a versão vigente no momento da implementação").
@Injectable()
export class LinkedInPublishService {
  private readonly logger = new Logger(LinkedInPublishService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly tokenEncryption: TokenEncryptionService,
  ) {}

  private get linkedInApiVersion(): string {
    return this.config.get<string>("LINKEDIN_API_VERSION") ?? "202501";
  }

  private restHeaders(accessToken: string): Record<string, string> {
    return {
      Authorization: `Bearer ${accessToken}`,
      "LinkedIn-Version": this.linkedInApiVersion,
      "X-Restli-Protocol-Version": "2.0.0",
      "Content-Type": "application/json",
    };
  }

  private async loadAccountContext(socialAccountId: string): Promise<LinkedInAccountContext> {
    const account = await this.prisma.socialAccount.findUniqueOrThrow({ where: { id: socialAccountId } });
    if (account.network !== "linkedin") {
      throw new Error(`Conta ${socialAccountId} não é uma conta LinkedIn (network=${account.network}).`);
    }
    return {
      accessToken: this.tokenEncryption.decrypt(account.accessTokenEncrypted),
      organizationUrn: `urn:li:organization:${account.externalAccountId}`,
    };
  }

  // Fluxo de 2 etapas exigido pelas Images/Documents API do LinkedIn:
  // 1) registra o upload (recebe uploadUrl + urn do asset)
  // 2) envia o binário via PUT direto no uploadUrl retornado
  private async uploadAsset(
    kind: "images" | "documents",
    ctx: LinkedInAccountContext,
    fileUrl: string,
  ): Promise<string> {
    const initRes = await fetch(`${API_BASE}/rest/${kind}?action=initializeUpload`, {
      method: "POST",
      headers: this.restHeaders(ctx.accessToken),
      body: JSON.stringify({ initializeUploadRequest: { owner: ctx.organizationUrn } }),
    });
    if (!initRes.ok) {
      throw new Error(`Falha ao iniciar upload de ${kind} no LinkedIn: ${initRes.status} ${await initRes.text()}`);
    }
    const initJson = (await initRes.json()) as {
      value: { uploadUrl: string; image?: string; document?: string };
    };
    const assetUrn = initJson.value.image ?? initJson.value.document;
    if (!assetUrn) {
      throw new Error(`Resposta de initializeUpload sem urn de asset para ${kind}.`);
    }

    const fileRes = await fetch(fileUrl);
    if (!fileRes.ok) {
      throw new Error(`Falha ao baixar arquivo para publicar (${fileUrl}): ${fileRes.status}`);
    }
    const fileBuffer = Buffer.from(await fileRes.arrayBuffer());

    const uploadRes = await fetch(initJson.value.uploadUrl, {
      method: "PUT",
      headers: { Authorization: `Bearer ${ctx.accessToken}` },
      body: fileBuffer,
    });
    if (!uploadRes.ok) {
      throw new Error(`Falha ao enviar binário de ${kind} para o LinkedIn: ${uploadRes.status}`);
    }

    return assetUrn;
  }

  async publishImagePost(socialAccountId: string, text: string, imageUrl: string): Promise<{ postUrn: string }> {
    const ctx = await this.loadAccountContext(socialAccountId);
    const imageUrn = await this.uploadAsset("images", ctx, imageUrl);
    return this.createPost(ctx, text, { media: imageUrn, mediaType: "image" });
  }

  async publishDocumentPost(
    socialAccountId: string,
    text: string,
    pdfUrl: string,
    documentTitle: string,
  ): Promise<{ postUrn: string }> {
    const ctx = await this.loadAccountContext(socialAccountId);
    const documentUrn = await this.uploadAsset("documents", ctx, pdfUrl);
    return this.createPost(ctx, text, { media: documentUrn, mediaType: "document", title: documentTitle });
  }

  private async createPost(
    ctx: LinkedInAccountContext,
    text: string,
    media: { media: string; mediaType: "image" | "document"; title?: string },
  ): Promise<{ postUrn: string }> {
    const content =
      media.mediaType === "image"
        ? { media: { id: media.media } }
        : { media: { id: media.media, title: media.title } };

    const res = await fetch(`${API_BASE}/rest/posts`, {
      method: "POST",
      headers: this.restHeaders(ctx.accessToken),
      body: JSON.stringify({
        author: ctx.organizationUrn,
        commentary: text,
        visibility: "PUBLIC",
        distribution: { feedDistribution: "MAIN_FEED", targetEntities: [], thirdPartyDistributionChannels: [] },
        content,
        lifecycleState: "PUBLISHED",
      }),
    });
    if (!res.ok) {
      throw new Error(`Falha ao criar post no LinkedIn: ${res.status} ${await res.text()}`);
    }
    const postUrn = res.headers.get("x-restli-id") ?? "";
    this.logger.log(`Post publicado no LinkedIn: ${postUrn}`);
    return { postUrn };
  }
}
