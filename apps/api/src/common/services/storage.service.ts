import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

// Wrapper fino sobre a Storage API REST do Supabase self-hospedado — mesmo padrao do
// supabase-admin.service.ts (evitar o SDK completo @supabase/supabase-js, que quebra
// no Node 20 por causa do RealtimeClient interno, ver historico do Task 006).
@Injectable()
export class StorageService {
  private readonly baseUrl: string;
  private readonly serviceRoleKey: string;

  constructor(config: ConfigService) {
    this.baseUrl = config.getOrThrow<string>("SUPABASE_URL");
    this.serviceRoleKey = config.getOrThrow<string>("SUPABASE_SERVICE_ROLE_KEY");
  }

  private headers(contentType?: string): Record<string, string> {
    return {
      apikey: this.serviceRoleKey,
      Authorization: `Bearer ${this.serviceRoleKey}`,
      ...(contentType ? { "Content-Type": contentType } : {}),
    };
  }

  async upload(
    bucket: string,
    path: string,
    file: Buffer,
    contentType: string,
  ): Promise<{ path: string; publicUrl: string }> {
    const res = await fetch(`${this.baseUrl}/storage/v1/object/${bucket}/${path}`, {
      method: "POST",
      headers: { ...this.headers(contentType), "x-upsert": "true" },
      body: new Uint8Array(file),
    });

    if (!res.ok) {
      throw new Error(`Falha ao subir arquivo no Storage: ${res.status} ${await res.text()}`);
    }

    return { path, publicUrl: this.getPublicUrl(bucket, path) };
  }

  getPublicUrl(bucket: string, path: string): string {
    return `${this.baseUrl}/storage/v1/object/public/${bucket}/${path}`;
  }

  async delete(bucket: string, path: string): Promise<void> {
    const res = await fetch(`${this.baseUrl}/storage/v1/object/${bucket}/${path}`, {
      method: "DELETE",
      headers: this.headers(),
    });
    if (!res.ok) {
      throw new Error(`Falha ao remover arquivo do Storage: ${res.status} ${await res.text()}`);
    }
  }
}
