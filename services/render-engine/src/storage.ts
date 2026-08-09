const BUCKET = "content-renders";

// REST puro (nao @supabase/supabase-js, apesar do spec 015 sugerir o SDK) — o SDK
// completo quebra no Node 20 por causa do RealtimeClient interno (mesma licao do
// spec 006/010, ver StorageService de apps/api).
export async function uploadRenderedAsset(
  path: string,
  buffer: Buffer,
  contentType: string,
): Promise<string> {
  const baseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!baseUrl || !serviceRoleKey) {
    throw new Error("SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios.");
  }

  const res = await fetch(`${baseUrl}/storage/v1/object/${BUCKET}/${path}`, {
    method: "POST",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": contentType,
      "x-upsert": "true",
    },
    body: new Uint8Array(buffer),
  });

  if (!res.ok) {
    throw new Error(`Falha ao subir asset renderizado: ${res.status} ${await res.text()}`);
  }

  return `${baseUrl}/storage/v1/object/public/${BUCKET}/${path}`;
}
