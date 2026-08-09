import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RejectModal } from "./RejectModal";
import { useApprovePiece, useRejectPiece, type ApprovalQueuePiece } from "@/hooks/useApprovalQueue";

interface ApprovalCardProps {
  piece: ApprovalQueuePiece;
  canModerate: boolean;
}

export function ApprovalCard({ piece, canModerate }: ApprovalCardProps): JSX.Element {
  const approvePiece = useApprovePiece();
  const rejectPiece = useRejectPiece();
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasAiGeneratedSlide = piece.slides.some((s) => s.imageSource === "ai_generated");
  const previewImage = piece.slides[0]?.renderedImageUrl ?? piece.slides[0]?.backgroundImageUrl;

  function handleApprove(): void {
    setError(null);
    approvePiece.mutate(piece.id, {
      onError: () => setError("Não foi possível aprovar — tente novamente."),
    });
  }

  function handleReject(reason: string): void {
    setError(null);
    rejectPiece.mutate(
      { id: piece.id, reason },
      {
        onSuccess: () => setShowRejectModal(false),
        onError: () => setError("Não foi possível rejeitar — tente novamente."),
      },
    );
  }

  return (
    <Card className="space-y-3 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="neutral">{piece.origin === "autopilot" ? "Piloto automático" : "Manual"}</Badge>
        <Badge variant="neutral">{piece.format === "carousel" ? "Carrossel" : "Post"}</Badge>
        {hasAiGeneratedSlide && <Badge variant="warning">Gerado por IA</Badge>}
      </div>

      {previewImage && (
        <div className="aspect-square w-full overflow-hidden rounded-lg bg-neutral-100">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={previewImage} alt="" className="h-full w-full object-cover" />
        </div>
      )}

      <p className="text-sm">{piece.slides[0]?.slideText || piece.copyText || "Sem copy definido."}</p>

      {error && <p className="text-sm text-danger">{error}</p>}

      {canModerate ? (
        <div className="flex gap-2">
          <Button size="sm" onClick={handleApprove} disabled={approvePiece.isPending}>
            Aprovar
          </Button>
          <Link href={`/content/new?contentPieceId=${piece.id}`}>
            <Button variant="secondary" size="sm">
              Editar
            </Button>
          </Link>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setShowRejectModal(true)}
            disabled={rejectPiece.isPending}
          >
            Rejeitar
          </Button>
        </div>
      ) : (
        <p className="text-xs text-neutral-600">Somente leitura — seu papel não permite moderar a fila.</p>
      )}

      {showRejectModal && (
        <RejectModal
          onConfirm={handleReject}
          onCancel={() => setShowRejectModal(false)}
          isSubmitting={rejectPiece.isPending}
        />
      )}
    </Card>
  );
}
