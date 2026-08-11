import { SupportChatWidget } from "@/components/support-chat/SupportChatWidget";
import { WorkspaceNav } from "@/components/navigation/WorkspaceNav";

// CA-04: widget disponível em toda tela do workspace (spec 052) sem precisar
// montar componente por componente — layout do grupo de rotas (workspace).
// WorkspaceNav (achado numa varredura completa do frontend): nenhuma das
// paginas do workspace tinha navegação entre si — só eram alcançáveis
// digitando a URL de cabeça. Agora toda tela do grupo (workspace) ganha a
// barra lateral automaticamente, sem precisar editar cada page.tsx.
export default function WorkspaceLayout({ children }: { children: React.ReactNode }): JSX.Element {
  return (
    <WorkspaceNav>
      {children}
      <SupportChatWidget />
    </WorkspaceNav>
  );
}
