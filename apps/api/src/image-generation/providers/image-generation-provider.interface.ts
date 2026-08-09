export interface ImageGenerationParams {
  prompt: string;
  referenceImageUrls: string[];
  referenceWeight: number;
  aspectRatio: string;
}

export interface ImageGenerationResult {
  imageUrl: string;
  providerJobId: string;
}

export interface ImageGenerationProvider {
  readonly providerName: string;
  isConfigured(): boolean;
  generate(params: ImageGenerationParams): Promise<ImageGenerationResult>;
}
