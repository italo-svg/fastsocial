import type { TargetFormat, TargetNetwork } from "./types";

export interface FormatSpec {
  width: number;
  height: number;
}

// Resolucoes alvo por rede/formato — ver PRD modulo 8. LinkedIn carrossel usa a
// mesma resolucao de imagem individual (1200x1200); o PDF multi-pagina e' gerado
// a partir dessas mesmas imagens (ver renderCarouselSlides.ts).
const NETWORK_FORMATS: Record<TargetNetwork, Record<TargetFormat, FormatSpec>> = {
  instagram: {
    static_post: { width: 1080, height: 1350 },
    carousel: { width: 1080, height: 1350 },
  },
  facebook: {
    static_post: { width: 1200, height: 630 },
    carousel: { width: 1080, height: 1080 },
  },
  linkedin: {
    static_post: { width: 1200, height: 1200 },
    carousel: { width: 1200, height: 1200 },
  },
};

export function getFormatSpec(network: TargetNetwork, format: TargetFormat): FormatSpec {
  const spec = NETWORK_FORMATS[network]?.[format];
  if (!spec) throw new Error(`Combinação de rede/formato não suportada: ${network}/${format}`);
  return spec;
}
