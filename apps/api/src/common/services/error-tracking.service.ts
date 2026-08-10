import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as Sentry from "@sentry/node";

// Wrapper fino sobre o SDK do Sentry (compatível com GlitchTip via DSN —
// spec 044). CA-04: nunca deixa uma falha na captura de erro derrubar a API
// — toda chamada aqui é best-effort, envolvida em try/catch, e sem
// GLITCHTIP_DSN configurada isso vira um no-op silencioso (mesmo padrão de
// degradação graciosa do resto do projeto).
@Injectable()
export class ErrorTrackingService {
  private readonly logger = new Logger(ErrorTrackingService.name);
  private initialized = false;

  constructor(private readonly config: ConfigService) {
    this.init();
  }

  isConfigured(): boolean {
    return !!this.config.get<string>("GLITCHTIP_DSN");
  }

  private init(): void {
    const dsn = this.config.get<string>("GLITCHTIP_DSN");
    if (!dsn) return;
    try {
      Sentry.init({ dsn, tracesSampleRate: 0 });
      this.initialized = true;
    } catch (err) {
      this.logger.warn(`Falha ao inicializar o SDK do Sentry/GlitchTip: ${(err as Error).message}`);
    }
  }

  captureException(error: unknown): void {
    if (!this.initialized) return;
    try {
      Sentry.captureException(error);
    } catch (err) {
      this.logger.warn(`Falha ao enviar exceção pro GlitchTip (ignorada, não propaga): ${(err as Error).message}`);
    }
  }
}
