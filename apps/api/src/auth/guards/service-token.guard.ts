import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { ServiceTokenStrategy } from "../strategies/service-token.strategy";

interface RequestWithHeaders {
  headers: Record<string, string | string[] | undefined>;
}

@Injectable()
export class ServiceTokenGuard implements CanActivate {
  constructor(private readonly serviceTokenStrategy: ServiceTokenStrategy) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RequestWithHeaders>();
    const authHeader = request.headers["authorization"];
    const headerValue = Array.isArray(authHeader) ? authHeader[0] : authHeader;
    const token = headerValue?.startsWith("Bearer ") ? headerValue.slice(7) : undefined;

    const result = this.serviceTokenStrategy.validate(token);
    if (!result) {
      throw new UnauthorizedException("Token de serviço inválido ou ausente.");
    }
    return true;
  }
}
