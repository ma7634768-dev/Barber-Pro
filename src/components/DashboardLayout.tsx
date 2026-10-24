import { useState } from "react";
import { NavLink, Navigate, Outlet, useNavigate } from "react-router-dom";
import { CalendarDays, ExternalLink, LayoutDashboard, LogOut, Menu, Scissors, Settings, ShoppingBag, Users, UserSquare2, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useBarbershop } from "@/lib/barbershop";
import { NotificationsProvider } from "@/lib/notifications";
import { Logo } from "./Logo";
import { NotificationBell } from "./NotificationBell";
import { Spinner, cn } from "./ui";

const NAV = [
  { to: "/painel", label: "Visão geral", icon: LayoutDashboard, end: true },
  { to: "/painel/agenda", label: "Agenda", icon: CalendarDays },
  { to: "/painel/barbeiros", label: "Barbeiros", icon: UserSquare2 },
  { to: "/painel/servicos", label: "Serviços", icon: Scissors },
  { to: "/painel/produtos", label: "Produtos", icon: ShoppingBag },
  { to: "/painel/clientes", label: "Clientes", icon: Users },
  { to: "/painel/configuracoes", label: "Configurações", icon: Settings },
];

export function DashboardLayout() {
  const { shop, loading } = useBarbershop();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  if (loading) return <Spinner />;
  if (!shop) return <Navigate to="/comecar" replace />;

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const sidebar = (
    <nav className="flex h-full flex-col gap-1 p-4">
      <div className="mb-6 px-2">
        <div className="flex items-center justify-between">
          <Logo to="/painel" />
          <div className="hidden lg:block"><NotificationBell align="left" /></div>
        </div>
        <p className="mt-3 truncate text-sm text-muted-foreground">{shop.name}</p>
      </div>
      {NAV.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          onClick={() => setOpen(false)}
          className={({ isActive }) =>
            cn(
              "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition",
              isActive ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )
          }
        >
          <Icon className="h-4 w-4" />
          {label}
        </NavLink>
      ))}
      <a
        href={`/agendar/${shop.id}`}
        target="_blank"
        rel="noreferrer"
        className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <ExternalLink className="h-4 w-4" />
        Página de agendamento
      </a>
      <button
        onClick={signOut}
        className="mt-auto flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <LogOut className="h-4 w-4" />
        Sair
      </button>
    </nav>
  );

  return (
    <NotificationsProvider shop={shop}>
      <div className="min-h-screen lg:grid lg:grid-cols-[260px_1fr]">
        <aside className="sticky top-0 hidden h-screen border-r border-border bg-card lg:block">{sidebar}</aside>

        <header className="sticky top-0 z-40 flex items-center justify-between border-b border-border bg-background/90 px-4 py-3 backdrop-blur lg:hidden">
          <Logo to="/painel" />
          <div className="flex items-center gap-1">
            <NotificationBell />
            <button onClick={() => setOpen(true)} className="rounded-md p-2 hover:bg-muted" aria-label="Abrir menu">
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </header>
        {open && (
          <div className="fixed inset-0 z-50 bg-black/70 lg:hidden" onClick={() => setOpen(false)}>
            <aside className="relative h-full w-72 bg-card" onClick={(e) => e.stopPropagation()}>
              <button onClick={() => setOpen(false)} className="absolute right-3 top-4 rounded-md p-2 hover:bg-muted" aria-label="Fechar menu">
                <X className="h-5 w-5" />
              </button>
              {sidebar}
            </aside>
          </div>
        )}

        <main className="px-4 py-6 sm:px-8 sm:py-10">
          <Outlet />
        </main>
      </div>
    </NotificationsProvider>
  );
}
