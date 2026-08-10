import { TokenEncryptionService } from "./token-encryption.service";

function buildService(key?: string): TokenEncryptionService {
  const config = { get: jest.fn().mockReturnValue(key) };
  return new TokenEncryptionService(config as never);
}

describe("TokenEncryptionService", () => {
  const validKey = "a".repeat(64); // 32 bytes em hex

  it("CA-04: decrypt(encrypt(x)) retorna o texto original", () => {
    const service = buildService(validKey);
    const ciphertext = service.encrypt("meu-access-token-secreto");
    expect(service.decrypt(ciphertext)).toBe("meu-access-token-secreto");
  });

  it("CA-04: o texto cifrado nunca contém o texto plano", () => {
    const service = buildService(validKey);
    const ciphertext = service.encrypt("meu-access-token-secreto");
    expect(ciphertext).not.toContain("meu-access-token-secreto");
  });

  it("gera IVs diferentes a cada chamada (ciphertext não é determinístico)", () => {
    const service = buildService(validKey);
    const a = service.encrypt("mesmo-texto");
    const b = service.encrypt("mesmo-texto");
    expect(a).not.toBe(b);
  });

  it("isConfigured() reflete a ausência de TOKEN_ENCRYPTION_KEY", () => {
    expect(buildService(undefined).isConfigured()).toBe(false);
    expect(buildService(validKey).isConfigured()).toBe(true);
  });

  it("encrypt() lança erro claro sem TOKEN_ENCRYPTION_KEY configurada", () => {
    const service = buildService(undefined);
    expect(() => service.encrypt("x")).toThrow("TOKEN_ENCRYPTION_KEY não configurada.");
  });

  it("rejeita chave com tamanho inválido", () => {
    const service = buildService("chave-curta-demais");
    expect(() => service.encrypt("x")).toThrow(/32 bytes/);
  });
});
