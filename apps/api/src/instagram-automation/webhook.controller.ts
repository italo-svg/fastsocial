import { BadRequestException, Body, Controller, Get, HttpCode, Post, Query, UseGuards } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { WebhookSignatureGuard } from "./webhook-signature.guard";
import { InstagramWebhookService } from "./instagram-webhook.service";
import type { InstagramWebhookPayload } from "./dto/instagram-webhook-payload.dto";

// Rota pública de propósito — a Meta chama sem JWT nenhum. A única
// verificação de autenticidade no POST é a assinatura HMAC (WebhookSignatureGuard);
// o GET usa o handshake de verificação padrão da Meta (hub.verify_token).
@Controller("webhooks/instagram")
export class WebhookController {
  constructor(
    private readonly config: ConfigService,
    private readonly instagramWebhookService: InstagramWebhookService,
  ) {}

  // CA-01: handshake de verificação do webhook, chamado uma vez pela Meta ao
  // configurar a subscription no App Dashboard.
  @Get()
  verify(
    @Query("hub.mode") mode?: string,
    @Query("hub.verify_token") verifyToken?: string,
    @Query("hub.challenge") challenge?: string,
  ): string {
    const expectedToken = this.config.get<string>("META_WEBHOOK_VERIFY_TOKEN");
    if (mode !== "subscribe" || !expectedToken || verifyToken !== expectedToken || !challenge) {
      throw new BadRequestException("Verificação de webhook falhou.");
    }
    return challenge;
  }

  // CA-05: responde rápido — todo o trabalho pesado (matching + execução
  // real) é enfileirado, nunca síncrono aqui dentro.
  @UseGuards(WebhookSignatureGuard)
  @HttpCode(200)
  @Post()
  async receive(@Body() payload: InstagramWebhookPayload): Promise<{ received: true; enqueued: number }> {
    const { enqueued } = await this.instagramWebhookService.processPayload(payload);
    return { received: true, enqueued };
  }
}
