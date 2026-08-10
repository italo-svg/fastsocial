import { IsOptional, IsString, MinLength } from "class-validator";

export class SendMessageDto {
  @IsString()
  @MinLength(1)
  message!: string;

  // Aceito e ecoado de volta pra o client correlacionar a conversa, mas o
  // servidor não persiste nem usa histórico entre chamadas no MVP (item 4
  // do spec 052) — cada mensagem é respondida com base só no contexto
  // enviado nesta própria chamada.
  @IsOptional()
  @IsString()
  conversationId?: string;
}
