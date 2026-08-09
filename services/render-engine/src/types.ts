export interface Zone {
  id: string;
  type: "text" | "image" | "logo";
  slideIndex?: number;
  x: number;
  y: number;
  width: number;
  height: number;
  label?: string;
  maxLength?: number;
}

export interface BrandKit {
  colorPalette?: Record<string, string>;
  typography?: { fontFamily?: string };
  logoUrl?: string | null;
}

export type TargetNetwork = "instagram" | "facebook" | "linkedin";
export type TargetFormat = "static_post" | "carousel";

export interface RenderRequest {
  workspaceId: string;
  contentPieceId: string;
  templateId?: string;
  slotMap: { zones: Zone[] };
  brandKit: BrandKit;
  copyPerSlide: string[];
  backgroundImageUrls: string[];
  targetNetwork: TargetNetwork;
  targetFormat: TargetFormat;
}

export interface RenderResponse {
  slides: { order: number; imageUrl: string }[];
  documentUrl?: string;
}
