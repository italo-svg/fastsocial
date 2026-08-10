import { BadRequestException, Controller, Headers, HttpCode, Post, RawBodyRequest, Req } from "@nestjs/common";
import type { Request } from "express";
import { BillingService } from "./billing.service";
import { StripeWebhookHandlerService } from "./stripe-webhook-handler.service";

// SEM os guards padrão de propósito (spec 040) — o Stripe chama este
// endpoint sem JWT nenhum. A única validação de autenticidade é a
// assinatura HMAC no header stripe-signature, verificada dentro de
// billingService.constructWebhookEvent() com STRIPE_WEBHOOK_SECRET.
@Controller("billing")
export class BillingWebhookController {
  constructor(
    private readonly billingService: BillingService,
    private readonly stripeWebhookHandlerService: StripeWebhookHandlerService,
  ) {}

  @HttpCode(200)
  @Post("webhook")
  async webhook(@Req() req: RawBodyRequest<Request>, @Headers("stripe-signature") signature?: string): Promise<{ received: true }> {
    if (!req.rawBody || !signature) {
      throw new BadRequestException("Corpo bruto ou assinatura do Stripe ausente.");
    }

    let event;
    try {
      event = this.billingService.constructWebhookEvent(req.rawBody, signature);
    } catch (err) {
      throw new BadRequestException(`Assinatura de webhook inválida: ${(err as Error).message}`);
    }

    await this.stripeWebhookHandlerService.handle(event);
    return { received: true };
  }
}
