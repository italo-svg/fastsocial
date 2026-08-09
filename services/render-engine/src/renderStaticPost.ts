import { chromium } from "playwright";
import { buildSlideHtml } from "./htmlBuilder";
import { getFormatSpec } from "./networkFormats";
import type { RenderRequest } from "./types";

export async function renderStaticPost(req: RenderRequest): Promise<Buffer> {
  const { width, height } = getFormatSpec(req.targetNetwork, req.targetFormat);
  const zones = req.slotMap.zones.filter((z) => (z.slideIndex ?? 0) === 0);

  const html = buildSlideHtml({
    width,
    height,
    zones,
    brandKit: req.brandKit,
    copyText: req.copyPerSlide[0] ?? "",
    backgroundImageUrl: req.backgroundImageUrls[0],
    logoUrl: req.brandKit.logoUrl,
  });

  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width, height } });
    await page.setContent(html, { waitUntil: "networkidle" });
    return (await page.screenshot({ type: "png" })) as Buffer;
  } finally {
    await browser.close();
  }
}
