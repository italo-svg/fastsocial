"use client";

import { useMutation } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";

export interface ImageGenerationJob {
  id: string;
  contentSlideId: string;
  status: string;
  resultImageUrl: string | null;
  attemptNumber: number;
}

// generateAndEvaluate encadeia POST /image-generation/jobs + POST /jobs/:id/qa —
// o QA (spec 018) ja' resolve o loop de retry internamente ate' um estado
// terminal, entao uma unica chamada basta (sem precisar de polling no cliente).
export function useGenerateAndEvaluateImage() {
  return useMutation({
    mutationFn: async (contentSlideId: string): Promise<ImageGenerationJob> => {
      const job = await apiFetch<ImageGenerationJob>("/image-generation/jobs", {
        method: "POST",
        body: JSON.stringify({ contentSlideId }),
      });
      if (job.status === "failed" || !job.resultImageUrl) return job;

      return apiFetch<ImageGenerationJob>(`/image-generation/jobs/${job.id}/qa`, { method: "POST" });
    },
  });
}
