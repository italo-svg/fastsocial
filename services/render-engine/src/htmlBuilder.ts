import type { BrandKit, Zone } from "./types";

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// Trunca com reticencias para nunca vazar visualmente da zona (CA-04) — a IA de
// copy (spec 022) ja tenta respeitar o maxLength, isso e' a rede de seguranca final.
function truncate(text: string, maxLength?: number): string {
  if (!maxLength || text.length <= maxLength) return text;
  return `${text.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

interface BuildSlideHtmlParams {
  width: number;
  height: number;
  zones: Zone[];
  brandKit: BrandKit;
  copyText: string;
  backgroundImageUrl?: string;
  logoUrl?: string | null;
}

// Cada zona do slot_map vira uma div posicionada absolutamente — decisao do spec 015
// (HTML/CSS + Playwright, priorizando fidelidade tipografica sobre performance no MVP).
export function buildSlideHtml(params: BuildSlideHtmlParams): string {
  const { width, height, zones, brandKit, copyText, backgroundImageUrl, logoUrl } = params;
  const fontFamily = brandKit.typography?.fontFamily ?? "Inter";
  const textColor = brandKit.colorPalette?.primary ?? "#111827";

  const zonesHtml = zones
    .map((zone) => {
      const position = `position:absolute; left:${zone.x}px; top:${zone.y}px; width:${zone.width}px; height:${zone.height}px; overflow:hidden;`;

      if (zone.type === "image") {
        return `<div style="${position}">${
          backgroundImageUrl
            ? `<img src="${backgroundImageUrl}" style="width:100%; height:100%; object-fit:cover; display:block;" />`
            : ""
        }</div>`;
      }

      if (zone.type === "logo") {
        return `<div style="${position} display:flex; align-items:center; justify-content:center;">${
          logoUrl ? `<img src="${logoUrl}" style="max-width:100%; max-height:100%; object-fit:contain;" />` : ""
        }</div>`;
      }

      const text = truncate(copyText ?? "", zone.maxLength);
      return `<div style="${position} display:flex; align-items:flex-end; color:${textColor}; font-family:'${fontFamily}', sans-serif; font-weight:700; font-size:36px; line-height:1.25; word-wrap:break-word;">${escapeHtml(text)}</div>`;
    })
    .join("\n");

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      html, body { margin:0; padding:0; }
      * { box-sizing: border-box; }
    </style>
  </head>
  <body>
    <div style="position:relative; width:${width}px; height:${height}px; background:#ffffff; overflow:hidden;">
      ${zonesHtml}
    </div>
  </body>
</html>`;
}
