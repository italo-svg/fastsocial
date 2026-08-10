import { ArgumentsHost, Catch, HttpException } from "@nestjs/common";
import { BaseExceptionFilter } from "@nestjs/core";
import { ErrorTrackingService } from "../services/error-tracking.service";

// Filtro global (spec 044, CA-01): captura toda exceção não tratada e manda
// pro GlitchTip antes de delegar pro comportamento padrão do Nest (resposta
// HTTP formatada normalmente) — envia só exceções REAIS de bug (não
// HttpException esperadas como 404/400/403, que são fluxo de controle
// normal da aplicação, não erro pra rastrear).
@Catch()
export class ErrorTrackingFilter extends BaseExceptionFilter {
  constructor(private readonly errorTracking: ErrorTrackingService) {
    super();
  }

  catch(exception: unknown, host: ArgumentsHost): void {
    if (!(exception instanceof HttpException)) {
      this.errorTracking.captureException(exception);
    }
    super.catch(exception, host);
  }
}
