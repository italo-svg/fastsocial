export interface StepExecutionContext {
  accessToken: string;
  contactId: string;
}

// wait é o único step que não "faz" nada externo — só diz por quanto tempo o
// worker deve adiar o próximo step (delay nativo do BullMQ, spec 055 item 2).
export interface StepHandlerResult {
  delayMs?: number;
}
