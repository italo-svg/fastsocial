import { Injectable } from "@nestjs/common";
import { LinkedInPublishService } from "../../social-accounts/linkedin/linkedin-publish.service";
import type { NetworkPublisher, PublishContentPiece, PublishResult, PublishSocialAccount } from "./network-publisher.interface";

// LinkedIn segue o Caminho B decidido no spec 029 (Postiz não custodia
// documento/PDF de forma confiável): chama linkedin-publish.service.ts
// direto, que já cuida de token cifrado + fluxo de 2 etapas de upload.
@Injectable()
export class LinkedInPublisher implements NetworkPublisher {
  constructor(private readonly linkedInPublishService: LinkedInPublishService) {}

  supports(network: string): boolean {
    return network === "linkedin";
  }

  async publish(contentPiece: PublishContentPiece, socialAccount: PublishSocialAccount): Promise<PublishResult> {
    const text = contentPiece.copyText ?? "";

    if (contentPiece.documentUrl) {
      const { postUrn } = await this.linkedInPublishService.publishDocumentPost(
        socialAccount.id,
        text,
        contentPiece.documentUrl,
        `Carrossel — ${contentPiece.id}`,
      );
      return { referenceId: postUrn };
    }

    const firstSlideImage = contentPiece.slides.sort((a, b) => a.slideOrder - b.slideOrder)[0]?.renderedImageUrl;
    if (!firstSlideImage) {
      throw new Error("Peça sem imagem renderizada nem documento — rode o render antes de publicar.");
    }

    const { postUrn } = await this.linkedInPublishService.publishImagePost(socialAccount.id, text, firstSlideImage);
    return { referenceId: postUrn };
  }
}
