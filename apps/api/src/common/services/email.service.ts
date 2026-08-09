import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

// Provider generico de e-mail transacional (nao usado para convite de conta -
// isso passa pela Admin API do GoTrue, ver supabase-admin.service.ts). Usado
// para notificacoes do produto (ex: aviso de export de dados pronto, spec 042).
// Sem RESEND_API_KEY configurada, cai em modo mock (loga no console) em vez
// de falhar - mesmo padrao de degradacao graciosa dos demais specs de integracao.
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly resendApiKey?: string;

  constructor(config: ConfigService) {
    this.resendApiKey = config.get<string>("RESEND_API_KEY");
  }

  async send(params: SendEmailParams): Promise<void> {
    if (!this.resendApiKey) {
      this.logger.warn(
        `[MODO MOCK - sem RESEND_API_KEY] E-mail para ${params.to}: "${params.subject}"\n${params.html}`,
      );
      return;
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "FastSocial <noreply@fastsocial.dev>",
        to: params.to,
        subject: params.subject,
        html: params.html,
      }),
    });

    if (!res.ok) {
      this.logger.error(`Falha ao enviar e-mail via Resend: ${res.status} ${await res.text()}`);
    }
  }
}
