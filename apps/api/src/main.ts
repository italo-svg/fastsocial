import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AppModule } from "./app.module";
import { BullBoardService } from "./queue/bull-board.service";

async function bootstrap(): Promise<void> {
  // rawBody: true (spec 040) — preserva o corpo bruto em request.rawBody,
  // necessário para validar a assinatura HMAC do webhook do Stripe
  // (stripe.webhooks.constructEvent exige o payload byte-a-byte, não o JSON
  // já reserializado pelo body-parser padrão).
  const app = await NestFactory.create(AppModule, { rawBody: true });
  const config = app.get(ConfigService);

  app.setGlobalPrefix("api/v1");
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableCors({
    origin: config.get<string>("APP_BASE_URL"),
    credentials: true,
  });

  app.get(BullBoardService).mount(app);

  const port = config.get<number>("PORT") ?? 3333;
  await app.listen(port, "0.0.0.0");
  // eslint-disable-next-line no-console
  console.log(`FastSocial API rodando na porta ${port}`);
}

bootstrap();
