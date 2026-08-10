import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createCipheriv, createDecipheriv, createHmac, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

// Cifra tokens OAuth que o FastSocial precisa custodiar diretamente (spec 029,
// Caminho B do LinkedIn — sem Postiz por trás para guardar o token). Formato
// em repouso: "<iv>:<authTag>:<ciphertext>", tudo em hex.
@Injectable()
export class TokenEncryptionService {
  constructor(private readonly config: ConfigService) {}

  isConfigured(): boolean {
    return !!this.config.get<string>("TOKEN_ENCRYPTION_KEY");
  }

  private getKey(): Buffer {
    const key = this.config.get<string>("TOKEN_ENCRYPTION_KEY");
    if (!key) {
      throw new Error("TOKEN_ENCRYPTION_KEY não configurada.");
    }
    const buffer = Buffer.from(key, "hex");
    if (buffer.length !== 32) {
      throw new Error("TOKEN_ENCRYPTION_KEY deve ser uma string hex de 32 bytes (64 caracteres).");
    }
    return buffer;
  }

  encrypt(plaintext: string): string {
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, this.getKey(), iv);
    const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return `${iv.toString("hex")}:${authTag.toString("hex")}:${ciphertext.toString("hex")}`;
  }

  // Reaproveita a mesma chave de aplicação para assinar payloads curtos (ex.:
  // o `state` do OAuth do LinkedIn — spec 029) sem precisar de mais um env var.
  hmac(payload: string): string {
    return createHmac("sha256", this.getKey()).update(payload).digest("hex");
  }

  decrypt(payload: string): string {
    const [ivHex, authTagHex, ciphertextHex] = payload.split(":");
    if (!ivHex || !authTagHex || !ciphertextHex) {
      throw new Error("Formato inválido de token cifrado.");
    }
    const decipher = createDecipheriv(ALGORITHM, this.getKey(), Buffer.from(ivHex, "hex"));
    decipher.setAuthTag(Buffer.from(authTagHex, "hex"));
    const plaintext = Buffer.concat([
      decipher.update(Buffer.from(ciphertextHex, "hex")),
      decipher.final(),
    ]);
    return plaintext.toString("utf8");
  }
}
