import { useRef } from "react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export type ImageSource = "own_library" | "stock" | "ai_generated";

const OPTIONS: { value: ImageSource; title: string; description: string }[] = [
  {
    value: "own_library",
    title: "Biblioteca própria",
    description: "Você envia suas próprias fotos e artes para cada peça.",
  },
  {
    value: "stock",
    title: "Banco de imagens",
    description: "Usamos imagens de banco de acordo com o tema de cada post.",
  },
  {
    value: "ai_generated",
    title: "Geração com IA",
    description: "A IA cria imagens originais no estilo da sua marca.",
  },
];

const MAX_REFERENCE_IMAGES = 8;

interface Step4ImageSourceProps {
  value: ImageSource;
  onChange: (value: ImageSource) => void;
  referenceImages: string[];
  uploadingRefs: boolean;
  onUploadReferenceImages: (files: File[]) => void;
  onDeleteReferenceImage: (index: number) => void;
  warnings: string[];
}

export function Step4ImageSource({
  value,
  onChange,
  referenceImages,
  uploadingRefs,
  onUploadReferenceImages,
  onDeleteReferenceImage,
  warnings,
}: Step4ImageSourceProps): JSX.Element {
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFilesChange(e: React.ChangeEvent<HTMLInputElement>): void {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    onUploadReferenceImages(files);
    e.target.value = "";
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold">Fonte de imagem padrão</h2>
        <p className="mt-1 text-sm text-neutral-600">
          Como você quer que as imagens dos seus posts sejam definidas por padrão? Você pode mudar isso depois.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {OPTIONS.map((option) => (
          <Card
            key={option.value}
            className={cn(
              "cursor-pointer transition-all hover:shadow-md",
              value === option.value && "border-primary ring-1 ring-primary",
            )}
            onClick={() => onChange(option.value)}
          >
            <h3 className="font-semibold">{option.title}</h3>
            <p className="mt-1 text-xs text-neutral-600">{option.description}</p>
          </Card>
        ))}
      </div>

      {value === "ai_generated" && (
        <div className="space-y-3 rounded-lg border border-neutral-200 bg-neutral-50 p-4">
          <p className="text-sm text-neutral-600">
            Quanto mais imagens de referência da sua marca você enviar (produtos, ambientes, pessoas),
            mais fiel a IA será ao gerar novas imagens — evitando o efeito de &ldquo;imagem genérica de IA&rdquo;.
            Recomendamos pelo menos 3.
          </p>

          <div className="flex flex-wrap gap-3">
            {referenceImages.map((url, index) => (
              <div key={url} className="relative h-20 w-20 overflow-hidden rounded-lg border border-neutral-200">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt={`Referência ${index + 1}`} className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => onDeleteReferenceImage(index)}
                  className="absolute right-0 top-0 flex h-5 w-5 items-center justify-center rounded-bl bg-neutral-900/70 text-xs text-white"
                  aria-label="Remover imagem"
                >
                  ×
                </button>
              </div>
            ))}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg"
            multiple
            className="hidden"
            onChange={handleFilesChange}
          />
          <Button
            variant="secondary"
            type="button"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingRefs || referenceImages.length >= MAX_REFERENCE_IMAGES}
          >
            {uploadingRefs ? "Enviando..." : "+ Adicionar imagens de referência"}
          </Button>

          {warnings.map((warning) => (
            <p key={warning} className="text-sm text-warning">
              {warning}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
