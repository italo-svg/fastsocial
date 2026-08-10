export interface PublishContentPiece {
  id: string;
  copyText: string | null;
  documentUrl: string | null;
  slides: { slideOrder: number; renderedImageUrl: string | null }[];
}

export interface PublishSocialAccount {
  id: string;
  workspaceId: string;
  network: string;
  externalAccountId: string;
}

export interface PublishResult {
  referenceId: string;
}

export interface NetworkPublisher {
  supports(network: string): boolean;
  publish(contentPiece: PublishContentPiece, socialAccount: PublishSocialAccount): Promise<PublishResult>;
}
