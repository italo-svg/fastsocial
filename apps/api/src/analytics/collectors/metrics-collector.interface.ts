export interface CollectedMetrics {
  reach: number | null;
  impressions: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  saves: number | null;
}

export interface PublicationForCollection {
  id: string;
  postizReferenceId: string | null;
  socialAccount: {
    id: string;
    network: string;
    externalAccountId: string;
    accessTokenEncrypted: string;
  };
}

export interface NetworkMetricsCollector {
  supports(network: string): boolean;
  collect(publication: PublicationForCollection): Promise<CollectedMetrics>;
}
