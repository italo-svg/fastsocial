"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";

export interface AddonStatus {
  key: string;
  name: string;
  priceMonthlyCents: number;
  currency: string;
  status: "active" | "cancelled" | "not_subscribed";
}

const ADDONS_KEY = ["addons"];

export function useAddons() {
  return useQuery({
    queryKey: ADDONS_KEY,
    queryFn: () => apiFetch<AddonStatus[]>("/addons"),
  });
}

export function useSubscribeAddon() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (addonKey: string) => apiFetch(`/addons/${addonKey}/subscribe`, { method: "POST" }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ADDONS_KEY }),
  });
}
