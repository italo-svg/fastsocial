import { Injectable, NotFoundException, NotImplementedException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { PostizClientService } from "./postiz-client.service";
import { ConnectAccountDto } from "./dto/connect-account.dto";

@Injectable()
export class SocialAccountsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly postizClient: PostizClientService,
  ) {}

  // Garante que o workspace tem uma Organization dedicada no Postiz reusado,
  // provisionando sob demanda no primeiro acesso (spec 027/028) em vez de no
  // momento da criação do workspace.
  private async ensurePostizApiKey(workspaceId: string): Promise<string> {
    const workspace = await this.prisma.workspace.findUnique({ where: { id: workspaceId } });
    if (!workspace) {
      throw new NotFoundException("Workspace não encontrado.");
    }
    if (workspace.postizApiKey) {
      return workspace.postizApiKey;
    }

    const { apiKey } = await this.postizClient.provisionOrganization(workspace.name);
    await this.prisma.workspace.update({
      where: { id: workspaceId },
      data: { postizApiKey: apiKey },
    });
    return apiKey;
  }

  async list(workspaceId: string) {
    return this.prisma.socialAccount.findMany({
      where: { workspaceId },
      orderBy: { connectedAt: "desc" },
    });
  }

  // Sincroniza as integrações já conectadas na Organization do Postiz deste
  // workspace para a tabela social_accounts do FastSocial. O token OAuth real
  // fica só dentro do Postiz — accessTokenEncrypted guarda a referência
  // (id da integração no Postiz), nunca o token em si (PRD 7.7 / CA-03).
  async sync(workspaceId: string) {
    const apiKey = await this.ensurePostizApiKey(workspaceId);
    const integrations = await this.postizClient.listIntegrations(apiKey);

    const synced = [];
    for (const integration of integrations) {
      const account = await this.prisma.socialAccount.upsert({
        where: {
          workspaceId_network_externalAccountId: {
            workspaceId,
            network: integration.providerIdentifier,
            externalAccountId: integration.id,
          },
        },
        create: {
          workspaceId,
          network: integration.providerIdentifier,
          externalAccountId: integration.id,
          displayName: integration.name,
          accessTokenEncrypted: integration.id,
          status: integration.disabled ? "disconnected" : "connected",
        },
        update: {
          displayName: integration.name,
          status: integration.disabled ? "disconnected" : "connected",
        },
      });
      synced.push(account);
    }

    return { synced: synced.length, accounts: synced };
  }

  // CA-01 do spec 028 pede uma URL de início de OAuth do Postiz. Investigação
  // real (spec 027/028) confirmou que a API pública do Postiz v2.11.3 só
  // expõe listar/postar/desconectar integrações já existentes — iniciar uma
  // NOVA conexão OAuth exige uma sessão autenticada do frontend do Postiz
  // (NextAuth) escopada àquela organização, o que a API pública não oferece.
  // Não implementamos aqui nenhum mecanismo de sequestro de sessão do Postiz
  // (seria frágil e inseguro). Isso fica como lacuna arquitetural em aberto:
  // até resolvê-la, conectar uma nova conta Meta/Instagram requer acesso
  // direto ao Postiz (não exposto ao cliente do FastSocial), quebrando o
  // requisito de "cliente nunca sabe que o Postiz existe" para o fluxo de
  // PRIMEIRA conexão. list()/sync()/disconnect() funcionam normalmente para
  // contas já conectadas.
  async connect(workspaceId: string, dto: ConnectAccountDto): Promise<never> {
    await this.ensurePostizApiKey(workspaceId);
    throw new NotImplementedException(
      `Conectar uma nova conta ${dto.provider} ainda não é possível sem acesso direto ao Postiz: ` +
        "a API pública dele não expõe início de OAuth para uma organização específica (ver comentário em social-accounts.service.ts#connect). " +
        "Contas já conectadas no Postiz podem ser sincronizadas via POST /social-accounts/sync.",
    );
  }

  async disconnect(workspaceId: string, socialAccountId: string) {
    const account = await this.prisma.socialAccount.findFirst({
      where: { id: socialAccountId, workspaceId },
    });
    if (!account) {
      throw new NotFoundException("Conta social não encontrada neste workspace.");
    }

    const apiKey = await this.ensurePostizApiKey(workspaceId);
    await this.postizClient.disconnectIntegration(apiKey, account.externalAccountId);
    await this.prisma.socialAccount.update({
      where: { id: account.id },
      data: { status: "disconnected" },
    });

    return { id: account.id, status: "disconnected" };
  }
}
