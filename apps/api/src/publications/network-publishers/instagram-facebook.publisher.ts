import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { PostizClientService } from "../../social-accounts/postiz-client.service";
import type { NetworkPublisher, PublishContentPiece, PublishResult, PublishSocialAccount } from "./network-publisher.interface";

// Meta (Instagram/Facebook) publica via Postiz (spec 028), que custodia o
// token OAuth real — o FastSocial só conhece a apiKey da Organization do
// workspace e o id da integração (externalAccountId).
@Injectable()
export class InstagramFacebookPublisher implements NetworkPublisher {
  constructor(
    private readonly prisma: PrismaService,
    private readonly postizClient: PostizClientService,
  ) {}

  supports(network: string): boolean {
    return network === "facebook" || network === "instagram";
  }

  async publish(contentPiece: PublishContentPiece, socialAccount: PublishSocialAccount): Promise<PublishResult> {
    const workspace = await this.prisma.workspace.findUniqueOrThrow({ where: { id: socialAccount.workspaceId } });
    if (!workspace.postizApiKey) {
      throw new Error("Workspace sem Organization provisionada no Postiz — sincronize as contas antes de publicar.");
    }

    const mediaUrls = contentPiece.slides
      .sort((a, b) => a.slideOrder - b.slideOrder)
      .map((s) => s.renderedImageUrl)
      .filter((url): url is string => !!url);

    if (mediaUrls.length === 0) {
      throw new Error("Peça sem imagens renderizadas — rode o render antes de publicar.");
    }

    const { postId } = await this.postizClient.createPost(workspace.postizApiKey, {
      integrationId: socialAccount.externalAccountId,
      content: contentPiece.copyText ?? "",
      mediaUrls,
    });

    return { referenceId: postId };
  }
}
