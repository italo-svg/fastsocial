export interface RawSignal {
  sourceType: "competitor" | "hashtag_trend" | "topic_trend";
  sourceRef: string;
  rawText: string;
  rawUrl?: string;
}

export interface BrandKitContext {
  niche: string | null;
  competitors: string[];
}

export interface TrendSource {
  readonly sourceName: string;
  isEnabled(): boolean;
  fetch(brandKit: BrandKitContext): Promise<RawSignal[]>;
}
