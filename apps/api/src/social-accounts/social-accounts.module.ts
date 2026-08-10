import { Module } from "@nestjs/common";
import { SocialAccountsController } from "./social-accounts.controller";
import { SocialAccountsService } from "./social-accounts.service";
import { PostizClientService } from "./postiz-client.service";
import { TokenEncryptionService } from "../common/services/token-encryption.service";
import { LinkedInOAuthController } from "./linkedin/linkedin-oauth.controller";
import { LinkedInOAuthService } from "./linkedin/linkedin-oauth.service";
import { LinkedInPublishService } from "./linkedin/linkedin-publish.service";
import { LinkedInTokenRefreshJob } from "./linkedin/linkedin-token-refresh.job";

@Module({
  controllers: [SocialAccountsController, LinkedInOAuthController],
  providers: [
    SocialAccountsService,
    PostizClientService,
    TokenEncryptionService,
    LinkedInOAuthService,
    LinkedInPublishService,
    LinkedInTokenRefreshJob,
  ],
  exports: [PostizClientService, LinkedInPublishService],
})
export class SocialAccountsModule {}
