import { Injectable } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import { HealthChecker, ServiceHealth, runWithTimeout } from "./checker.types";

// Reusa o client Redis que o BullMQ ja mantem aberto (fila "publish") em vez
// de abrir uma conexao nova so pra isto — testa a MESMA conexao que o resto
// do produto depende (filas de publicacao/export), nao uma paralela.
@Injectable()
export class RedisChecker implements HealthChecker {
  readonly name = "redis";

  constructor(@InjectQueue("publish") private readonly publishQueue: Queue) {}

  check(): Promise<ServiceHealth> {
    return runWithTimeout(this.name, async () => {
      const client = await this.publishQueue.client;
      // IRedisClient (tipo do bullmq) não expõe .ping() na interface pública,
      // mas o objeto real em runtime é sempre uma instância ioredis — cast
      // pontual só pra este health check, sem depender de ioredis como
      // dependência declarada do projeto.
      const pong = (await (client as unknown as { ping(): Promise<string> }).ping()) as string;
      return pong === "PONG" ? { status: "up" } : { status: "down", detail: `PING inesperado: ${pong}` };
    });
  }
}
