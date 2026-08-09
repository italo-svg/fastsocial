import express, { type Request, type Response } from "express";
import { renderStaticPost } from "./renderStaticPost";
import { renderCarouselSlides } from "./renderCarouselSlides";
import { uploadRenderedAsset } from "./storage";
import type { RenderRequest, RenderResponse } from "./types";

const app = express();
app.use(express.json({ limit: "5mb" }));

const RENDER_TIMEOUT_MS = 30_000;

async function assertUrlAccessible(url: string | undefined | null, label: string): Promise<void> {
  if (!url) return;
  let res: globalThis.Response;
  try {
    res = await fetch(url);
  } catch {
    throw new Error(`${label} inacessível: ${url}`);
  }
  if (!res.ok) {
    throw new Error(`${label} inacessível (HTTP ${res.status}): ${url}`);
  }
}

async function validateAssets(body: RenderRequest): Promise<void> {
  for (let i = 0; i < body.backgroundImageUrls.length; i++) {
    await assertUrlAccessible(body.backgroundImageUrls[i], `Imagem de fundo do slide ${i + 1}`);
  }
  await assertUrlAccessible(body.brandKit.logoUrl, "Logo do brand kit");
}

async function handleRender(body: RenderRequest): Promise<RenderResponse> {
  await validateAssets(body);

  if (body.targetFormat === "static_post") {
    const buffer = await renderStaticPost(body);
    const path = `workspaces/${body.workspaceId}/content/${body.contentPieceId}/slide-1.png`;
    const imageUrl = await uploadRenderedAsset(path, buffer, "image/png");
    return { slides: [{ order: 1, imageUrl }] };
  }

  return renderCarouselSlides(body);
}

app.post("/render", (req: Request, res: Response) => {
  const body = req.body as RenderRequest;

  const timeout = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error("Render excedeu o tempo limite de 30s.")), RENDER_TIMEOUT_MS);
  });

  Promise.race([handleRender(body), timeout])
    .then((result) => res.json(result))
    .catch((err: unknown) => {
      const message = err instanceof Error ? err.message : "Erro desconhecido ao renderizar.";
      res.status(422).json({ message });
    });
});

app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok" });
});

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3334;
app.listen(PORT, "0.0.0.0", () => {
  // eslint-disable-next-line no-console
  console.log(`Render engine rodando na porta ${PORT}`);
});
