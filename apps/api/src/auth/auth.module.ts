import { Module } from "@nestjs/common";
import { PassportModule } from "@nestjs/passport";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { SupabaseJwtStrategy } from "./strategies/supabase-jwt.strategy";
import { ServiceTokenStrategy } from "./strategies/service-token.strategy";
import { SupabaseAdminService } from "../common/services/supabase-admin.service";

@Module({
  imports: [PassportModule],
  controllers: [AuthController],
  providers: [AuthService, SupabaseJwtStrategy, ServiceTokenStrategy, SupabaseAdminService],
  exports: [SupabaseAdminService, ServiceTokenStrategy],
})
export class AuthModule {}
