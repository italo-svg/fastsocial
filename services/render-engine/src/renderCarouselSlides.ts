import { chromium } from "playwright";
import { PDFDocument } from "pdf-lib";
import { buildSlideHtml } from "./htmlBuilder";
import { getFormatSpec } from "./networkFormats";
import { uploadRenderedAsset } from "./storage";
import type { RenderRequest, RenderResponse } from "./types";

export async function renderCarouselSlides(req: RenderRequest): Promise<RenderResponse> {
  const { width, height } = getFormatSpec(req.targetNetwork, req.targetFormat);
  const slideCount = Math.max(req.backgroundImageUrls.length, req.copyPerSlide.length, 1);

  const buffers: Buffer[] = [];
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width, height } });
    for (let i = 0; i < slideCount; i++) {
      const zones = req.slotMap.zones.filter((z) => (z.slideIndex ?? 0) === i);
      const html = buildSlideHtml({
        width,
        height,
        zones,
        brandKit: req.brandKit,
        copyText: req.copyPerSlide[i] ?? "",
        backgroundImageUrl: req.backgroundImageUrls[i],
        logoUrl: req.brandKit.logoUrl,
      });
      await page.setContent(html, { waitUntil: "networkidle" });
      buffers.push((await page.screenshot({ type: "png" })) as Buffer);
    }
  } finally {
    await browser.close();
  }

  const slides: RenderResponse["slides"] = [];
  for (let i = 0; i < buffers.length; i++) {
    const path = `workspaces/${req.workspaceId}/content/${req.contentPieceId}/slide-${i + 1}.png`;
    const imageUrl = await uploadRenderedAsset(path, buffers[i]!, "image/png");
    slides.push({ order: i + 1, imageUrl });
  }

  let documentUrl: string | undefined;
  // Carrossel do LinkedIn e' publicado como post de documento (PDF), nao imagens
  // individuais soltas — ver PRD modulo 8.
  if (req.targetNetwork === "linkedin") {
    const pdfDoc = await PDFDocument.create();
    for (const buffer of buffers) {
      const image = await pdfDoc.embedPng(buffer);
      const pdfPage = pdfDoc.addPage([image.width, image.height]);
      pdfPage.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });
    }
    const pdfBytes = await pdfDoc.save();
    const pdfPath = `workspaces/${req.workspaceId}/content/${req.contentPieceId}/document.pdf`;
    documentUrl = await uploadRenderedAsset(pdfPath, Buffer.from(pdfBytes), "application/pdf");
  }

  return { slides, documentUrl };
}
