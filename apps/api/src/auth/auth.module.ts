import { Module } from "@nestjs/common";
import { PassportModule } from "@nestjs/passport";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { SupabaseJwtStrategy } from "./strategies/supabase-jwt.strategy";
import { SupabaseAdminService } from "../common/services/supabase-admin.service";

@Module({
  imports: [PassportModule],
  controllers: [AuthController],
  providers: [AuthService, SupabaseJwtStrategy, SupabaseAdminService],
  exports: [SupabaseAdminService],
})
export class AuthModule {}
