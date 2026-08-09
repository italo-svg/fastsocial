import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";

export interface SupabaseJwtPayload {
  sub: string;
  email: string;
  role: string;
  exp: number;
}

@Injectable()
export class SupabaseJwtStrategy extends PassportStrategy(Strategy, "supabase-jwt") {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>("SUPABASE_JWT_SECRET"),
    });
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async validate(payload: SupabaseJwtPayload): Promise<{ id: string; email: string }> {
    return { id: payload.sub, email: payload.email };
  }
}
