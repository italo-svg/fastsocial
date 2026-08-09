import { IsIn } from "class-validator";

export class ImportTemplateDto {
  @IsIn(["canva_import", "gamma_import"])
  source!: string;
}
