// passport-custom não publica tipos próprios nem tem pacote @types (checado
// na build do spec 032 — 404 no registry). Declaração mínima só com o que
// ServiceTokenStrategy usa.
declare module "passport-custom" {
  import { Strategy as PassportStrategy } from "passport";
  import type { Request } from "express";

  export class Strategy extends PassportStrategy {
    constructor(verify: (req: Request, done: (error: unknown, user?: unknown) => void) => void);
  }
}
