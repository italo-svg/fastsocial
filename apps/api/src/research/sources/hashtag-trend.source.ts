import { Injectable } from "@nestjs/common";
import type { BrandKitContext, RawSignal, TrendSource } from "./trend-source.interface";

// Stub — nenhuma API de hashtag/trend gratuita e robusta o suficiente foi escolhida
// ainda (gap conhecido do MVP, ver spec 021 Notas de Implementacao). isEnabled()
// sempre falso ate' um provider real ser integrado; existe so' para a interface
// TrendSource ficar completa e o pipeline nao precisar mudar quando um provider
// real entrar.
@Injectable()
export class HashtagTrendSource implements TrendSource {
  readonly sourceName = "hashtag_trend_stub";

  isEnabled(): boolean {
    return false;
  }

  async fetch(_brandKit: BrandKitContext): Promise<RawSignal[]> {
    return [];
  }
}
