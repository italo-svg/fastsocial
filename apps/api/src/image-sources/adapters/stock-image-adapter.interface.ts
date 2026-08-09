export interface NormalizedStockImage {
  id: string;
  thumbnailUrl: string;
  fullUrl: string;
  attribution: string;
  provider: string;
}

export type ImageOrientation = "square" | "portrait" | "landscape";

export interface StockImageAdapter {
  readonly providerName: string;
  isConfigured(): boolean;
  search(query: string, orientation?: ImageOrientation): Promise<NormalizedStockImage[]>;
}
