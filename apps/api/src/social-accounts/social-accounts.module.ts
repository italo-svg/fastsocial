import { Module } from "@nestjs/common";
import { SocialAccountsController } from "./social-accounts.controller";
import { SocialAccountsService } from "./social-accounts.service";
import { PostizClientService } from "./postiz-client.service";

@Module({
  controllers: [SocialAccountsController],
  providers: [SocialAccountsService, PostizClientService],
})
export class SocialAccountsModule {}
