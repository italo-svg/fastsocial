import { createParamDecorator, ExecutionContext } from "@nestjs/common";

export interface CurrentWorkspacePayload {
  id: string;
  role: string;
}

export const CurrentWorkspace = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): CurrentWorkspacePayload => {
    const request = ctx
      .switchToHttp()
      .getRequest<{ workspaceId: string; workspaceRole: string }>();
    return { id: request.workspaceId, role: request.workspaceRole };
  },
);
