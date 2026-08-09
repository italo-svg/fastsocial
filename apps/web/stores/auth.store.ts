import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AuthState {
  activeWorkspaceId: string | null;
  setActiveWorkspace: (id: string) => void;
  clear: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      activeWorkspaceId: null,
      setActiveWorkspace: (id) => set({ activeWorkspaceId: id }),
      clear: () => set({ activeWorkspaceId: null }),
    }),
    { name: "fastsocial-auth" },
  ),
);
