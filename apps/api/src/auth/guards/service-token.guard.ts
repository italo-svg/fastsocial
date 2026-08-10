import { Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

@Injectable()
export class ServiceTokenGuard extends AuthGuard("service-token") {}
