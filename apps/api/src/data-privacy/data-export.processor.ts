import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import type { Job } from "bullmq";
import { DataExportService } from "./data-export.service";

interface ExportJobData {
  workspaceId: string;
  requestedByEmail: string;
}

@Processor("data-export")
export class DataExportProcessor extends WorkerHost {
  private readonly logger = new Logger(DataExportProcessor.name);

  constructor(private readonly dataExportService: DataExportService) {
    super();
  }

  async process(job: Job<ExportJobData>): Promise<void> {
    const { workspaceId, requestedByEmail } = job.data;
    try {
      await this.dataExportService.collectAndUpload(workspaceId, requestedByEmail);
    } catch (err) {
      this.logger.error(`Falha ao gerar export do workspace ${workspaceId}: ${(err as Error).message}`);
      throw err;
    }
  }
}
