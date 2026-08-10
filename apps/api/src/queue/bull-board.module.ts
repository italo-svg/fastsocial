import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { BullBoardService } from "./bull-board.service";

@Module({
  imports: [BullModule.registerQueue({ name: "publish" }, { name: "data-export" })],
  providers: [BullBoardService],
  exports: [BullBoardService],
})
export class BullBoardModule {}
