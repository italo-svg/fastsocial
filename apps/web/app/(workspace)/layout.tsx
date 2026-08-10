import { SupportChatWidget } from "@/components/support-chat/SupportChatWidget";

// CA-04: widget disponível em toda tela do workspace (spec 052) sem precisar
// montar componente por componente — layout do grupo de rotas (workspace).
export default function WorkspaceLayout({ children }: { children: React.ReactNode }): JSX.Element {
  return (
    <>
      {children}
      <SupportChatWidget />
    </>
  );
}
