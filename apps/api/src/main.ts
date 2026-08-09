import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AppModule } from "./app.module";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  app.setGlobalPrefix("api/v1");
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableCors({
    origin: config.get<string>("APP_BASE_URL"),
    credentials: true,
  });

  const port = config.get<number>("PORT") ?? 3333;
  await app.listen(port, "0.0.0.0");
  // eslint-disable-next-line no-console
  console.log(`FastSocial API rodando na porta ${port}`);
}

bootstrap();
