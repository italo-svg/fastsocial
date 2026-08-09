import { Injectable, NotImplementedException } from "@nestjs/common";
import type { ImageOrientation, NormalizedStockImage, StockImageAdapter } from "./stock-image-adapter.interface";

// Stub — a interface existe para facilitar a troca futura de provider (spec 016,
// Notas de Implementacao), sem prioridade de implementacao completa agora.
@Injectable()
export class PexelsAdapter implements StockImageAdapter {
  readonly providerName = "pexels";

  isConfigured(): boolean {
    return false;
  }

  search(_query: string, _orientation?: ImageOrientation): Promise<NormalizedStockImage[]> {
    throw new NotImplementedException("Adapter do Pexels ainda não implementado.");
  }
}
