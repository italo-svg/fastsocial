"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/research", label: "Pesquisa" },
  { href: "/content/new", label: "Criar conteúdo" },
  { href: "/approval-queue", label: "Fila de aprovação" },
  { href: "/templates", label: "Templates" },
  { href: "/automations", label: "Automações" },
  { href: "/autopilot", label: "Piloto automático" },
  { href: "/connections", label: "Conexões" },
  { href: "/analytics", label: "Analytics" },
];

function isActive(pathname: string, href: string): boolean {
  return href === "/dashboard" ? pathname === href : pathname.startsWith(href);
}

// Layout de duas colunas fixo — o app não tinha NENHUMA navegação entre as
// paginas do workspace antes disso (cada page.tsx era só alcançável digitando
// a URL de cabeça), achado real numa varredura completa do frontend.
export function WorkspaceNav({ children }: { children: React.ReactNode }): JSX.Element {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-56 shrink-0 flex-col border-r border-[var(--card-border)] bg-[var(--card-background)] p-4 sm:flex">
        <Link href="/dashboard" className="mb-6 px-2 text-lg font-bold">
          FastSocial
        </Link>
        <nav className="flex flex-1 flex-col gap-1">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive(pathname, item.href)
                  ? "bg-primary/10 text-primary"
                  : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="mt-4 space-y-2 border-t border-[var(--card-border)] pt-4">
          {user && <p className="truncate px-2 text-xs text-neutral-500">{user.email}</p>}
          <Button variant="secondary" size="sm" className="w-full" onClick={logout}>
            Sair
          </Button>
        </div>
      </aside>

      <nav className="flex gap-1 overflow-x-auto border-b border-[var(--card-border)] bg-[var(--card-background)] p-2 sm:hidden">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "shrink-0 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium",
              isActive(pathname, item.href) ? "bg-primary/10 text-primary" : "text-neutral-600",
            )}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
