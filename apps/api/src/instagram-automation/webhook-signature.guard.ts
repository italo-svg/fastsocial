import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createHmac, timingSafeEqual } from "node:crypto";
import type { Request } from "express";
import type { RawBodyRequest } from "@nestjs/common";

// CA-02: rejeita com 401 ANTES de qualquer processamento — nunca confia em
// payload sem assinatura válida, mesmo padrão do webhook do Stripe (spec
// 040), mas verificando X-Hub-Signature-256 (formato da Meta) em vez do
// stripe-signature.
@Injectable()
export class WebhookSignatureGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RawBodyRequest<Request>>();
    const appSecret = this.config.get<string>("META_APP_SECRET");
    if (!appSecret) {
      throw new UnauthorizedException("META_APP_SECRET não configurado — webhook não pode ser verificado.");
    }

    const signatureHeader = request.headers["x-hub-signature-256"];
    const signature = Array.isArray(signatureHeader) ? signatureHeader[0] : signatureHeader;
    if (!signature || !request.rawBody) {
      throw new UnauthorizedException("Assinatura ausente.");
    }

    const expected = `sha256=${createHmac("sha256", appSecret).update(request.rawBody).digest("hex")}`;
    const expectedBuf = Buffer.from(expected);
    const actualBuf = Buffer.from(signature);

    if (expectedBuf.length !== actualBuf.length || !timingSafeEqual(expectedBuf, actualBuf)) {
      throw new UnauthorizedException("Assinatura inválida.");
    }
    return true;
  }
}
