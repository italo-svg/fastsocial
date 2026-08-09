"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";

export interface ApprovalQueueSlide {
  id: string;
  slideOrder: number;
  slideText: string | null;
  imageSource: "own_library" | "stock_bank" | "ai_generated";
  backgroundImageUrl: string | null;
  renderedImageUrl: string | null;
}

export interface ApprovalQueuePiece {
  id: string;
  format: "static_post" | "carousel";
  origin: string;
  status: string;
  copyText: string | null;
  rejectionReason: string | null;
  createdAt: string;
  slides: ApprovalQueueSlide[];
}

const QUEUE_KEY = ["content-pieces", "pending_approval"];

export function useApprovalQueue() {
  return useQuery({
    queryKey: QUEUE_KEY,
    queryFn: () => apiFetch<ApprovalQueuePiece[]>("/content-pieces?status=pending_approval"),
    select: (pieces) =>
      [...pieces].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
  });
}

export function useApprovePiece() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch(`/content-pieces/${id}/approve`, { method: "POST" }),
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: QUEUE_KEY });
      const previous = queryClient.getQueryData<ApprovalQueuePiece[]>(QUEUE_KEY);
      queryClient.setQueryData<ApprovalQueuePiece[]>(QUEUE_KEY, (old) =>
        (old ?? []).filter((p) => p.id !== id),
      );
      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) queryClient.setQueryData(QUEUE_KEY, context.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: QUEUE_KEY }),
  });
}

export function useRejectPiece() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      apiFetch(`/content-pieces/${id}/reject`, { method: "POST", body: JSON.stringify({ reason }) }),
    onMutate: async ({ id }) => {
      await queryClient.cancelQueries({ queryKey: QUEUE_KEY });
      const previous = queryClient.getQueryData<ApprovalQueuePiece[]>(QUEUE_KEY);
      queryClient.setQueryData<ApprovalQueuePiece[]>(QUEUE_KEY, (old) =>
        (old ?? []).filter((p) => p.id !== id),
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(QUEUE_KEY, context.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: QUEUE_KEY }),
  });
}
