import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import WebSocket from "ws";

// Cliente com service_role — usado só para operacoes administrativas
// (convite de usuario, gestao de buckets), nunca para validar sessao de usuario comum.
// Nao usamos Realtime aqui, mas o supabase-js instancia o RealtimeClient internamente
// mesmo assim; Node 20 nao tem WebSocket nativo, entao precisa do pacote "ws" explicito
// (sem isso, createClient() lanca excecao na construcao — nao e opcional).
@Injectable()
export class SupabaseAdminService {
  public readonly client: SupabaseClient;

  constructor(config: ConfigService) {
    this.client = createClient(
      config.getOrThrow<string>("SUPABASE_URL"),
      config.getOrThrow<string>("SUPABASE_SERVICE_ROLE_KEY"),
      {
        auth: { autoRefreshToken: false, persistSession: false },
        realtime: { transport: WebSocket as unknown as never },
      },
    );
  }
}
