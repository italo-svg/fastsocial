import { SetMetadata } from "@nestjs/common";

export const REQUIRES_ADDON_KEY = "requiresAddon";

// Genérico e reutilizável por qualquer add-on futuro (Nota do spec 053), não
// específico de Instagram — mesmo padrão do @Roles().
export const RequiresAddon = (addonKey: string): ReturnType<typeof SetMetadata> =>
  SetMetadata(REQUIRES_ADDON_KEY, addonKey);
