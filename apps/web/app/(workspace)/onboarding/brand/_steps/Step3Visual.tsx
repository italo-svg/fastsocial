import { useRef } from "react";
import { Button } from "@/components/ui/button";

const FONT_OPTIONS = ["Inter", "Poppins", "Montserrat", "Playfair Display", "Roboto", "Lato"];

export interface Palette {
  primary: string;
  secondary: string;
  accent: string;
}

interface Step3VisualProps {
  logoUrl: string | null;
  uploadingLogo: boolean;
  onUploadLogo: (file: File) => void;
  palette: Palette;
  onPaletteChange: (palette: Palette) => void;
  fontFamily: string;
  onFontFamilyChange: (font: string) => void;
  error?: string | null;
}

// Extrai uma cor média aproximada da logo via Canvas — nice-to-have de UX (spec 011).
// Se a imagem vier de outra origem sem CORS liberado, falha silenciosamente e o
// usuario ajusta a paleta manualmente (comportamento esperado, ver Notas de Implementacao).
async function extractDominantColor(imageUrl: string): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth || 1;
        canvas.height = img.naturalHeight || 1;
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve(null);
        ctx.drawImage(img, 0, 0);
        const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
        let r = 0;
        let g = 0;
        let b = 0;
        let count = 0;
        for (let i = 0; i < data.length; i += 4 * 17) {
          if (data[i + 3] < 128) continue;
          r += data[i];
          g += data[i + 1];
          b += data[i + 2];
          count++;
        }
        if (count === 0) return resolve(null);
        const toHex = (v: number) => Math.round(v / count).toString(16).padStart(2, "0");
        resolve(`#${toHex(r)}${toHex(g)}${toHex(b)}`);
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = imageUrl;
  });
}

export function Step3Visual({
  logoUrl,
  uploadingLogo,
  onUploadLogo,
  palette,
  onPaletteChange,
  fontFamily,
  onFontFamilyChange,
  error,
}: Step3VisualProps): JSX.Element {
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = e.target.files?.[0];
    if (!file) return;
    onUploadLogo(file);
  }

  async function handleLogoLoadedForExtraction(url: string): Promise<void> {
    const color = await extractDominantColor(url);
    if (color) onPaletteChange({ ...palette, primary: color });
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-neutral-900">Logo e identidade visual</h2>
        <p className="mt-1 text-sm text-neutral-600">
          Envie sua logo — vamos sugerir uma paleta de cores automaticamente (você pode ajustar depois).
        </p>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-neutral-900">Logo</label>
        <div className="flex items-center gap-4">
          <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-lg border border-neutral-200 bg-neutral-50">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl}
                alt="Logo da marca"
                className="h-full w-full object-contain"
                onLoad={() => handleLogoLoadedForExtraction(logoUrl)}
              />
            ) : (
              <span className="text-xs text-neutral-400">Sem logo</span>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/svg+xml"
            className="hidden"
            onChange={handleFileChange}
          />
          <Button
            variant="secondary"
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingLogo}
          >
            {uploadingLogo ? "Enviando..." : logoUrl ? "Trocar logo" : "Enviar logo"}
          </Button>
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-neutral-900">Paleta de cores</label>
        <div className="flex gap-4">
          {(["primary", "secondary", "accent"] as const).map((key) => (
            <div key={key} className="flex flex-col items-center gap-1">
              <input
                type="color"
                value={palette[key] || "#4F46E5"}
                onChange={(e) => onPaletteChange({ ...palette, [key]: e.target.value })}
                className="h-10 w-14 cursor-pointer rounded border border-neutral-200"
              />
              <span className="text-xs capitalize text-neutral-600">
                {key === "primary" ? "Primária" : key === "secondary" ? "Secundária" : "Destaque"}
              </span>
            </div>
          ))}
        </div>
        {error && <p className="text-sm text-danger">{error}</p>}
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-neutral-900">Tipografia</label>
        <select
          className="h-10 w-full rounded-lg border border-neutral-200 px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          value={fontFamily}
          onChange={(e) => onFontFamilyChange(e.target.value)}
        >
          {FONT_OPTIONS.map((font) => (
            <option key={font} value={font}>
              {font}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
