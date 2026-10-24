import { useState } from "react";
import { NavLink, Navigate, Outlet, useNavigate } from "react-router-dom";
import { BarChart3, CalendarDays, ClipboardList, Crown, ExternalLink, LayoutDashboard, LogOut, Menu, Scissors, Settings, ShoppingBag, Users, UserSquare2, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useBarbershop } from "@/lib/barbershop";
import { NotificationsProvider } from "@/lib/notifications";
import { Logo } from "./Logo";
import { NotificationBell } from "./NotificationBell";
import { Spinner, cn, initials } from "./ui";

const NAV = [
  { to: "/painel", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/painel/agenda", label: "Agenda", icon: CalendarDays },
  { to: "/painel/agendamentos", label: "Agendamentos", icon: ClipboardList },
  { to: "/painel/barbeiros", label: "Barbeiros", icon: UserSquare2 },
  { to: "/painel/servicos", label: "Serviços", icon: Scissors },
  { to: "/painel/produtos", label: "Produtos", icon: ShoppingBag },
  { to: "/painel/clientes", label: "Clientes", icon: Users },
  { to: "/painel/relatorios", label: "Relatórios", icon: BarChart3 },
];

const linkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition",
    isActive ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground",
  );

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

  const avatar = (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground" title={shop.name}>
      {initials(shop.name)}
    </div>
  );

  const sidebar = (
    <nav className="flex h-full flex-col gap-1 overflow-y-auto p-4">
      <div className="mb-6 px-2">
        <Logo to="/painel" />
      </div>
      {NAV.map(({ to, label, icon: Icon, end }) => (
        <NavLink key={to} to={to} end={end} onClick={() => setOpen(false)} className={linkClass}>
          <Icon className="h-4 w-4" />
          {label}
        </NavLink>
      ))}

      <div className="mt-auto space-y-1 border-t border-border pt-4">
        <NavLink
          to="/painel/assinatura"
          onClick={() => setOpen(false)}
          className={({ isActive }) =>
            cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition",
              isActive ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary hover:bg-primary/20",
            )
          }
        >
          <Crown className="h-4 w-4" />
          Assinatura
        </NavLink>
        <NavLink to="/painel/configuracoes" onClick={() => setOpen(false)} className={linkClass}>
          <Settings className="h-4 w-4" />
          Configurações
        </NavLink>
        <a
          href={`/agendar/${shop.id}`}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <ExternalLink className="h-4 w-4" />
          Página de agendamento
        </a>
        <button
          onClick={signOut}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <LogOut className="h-4 w-4" />
          Sair
        </button>
      </div>
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
            {avatar}
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

        <div className="min-w-0">
          <header className="sticky top-0 z-30 hidden items-center justify-end gap-3 border-b border-border bg-background/90 px-8 py-3 backdrop-blur lg:flex">
            <NotificationBell />
            <div className="flex items-center gap-3">
              {avatar}
              <div className="leading-tight">
                <p className="max-w-[200px] truncate text-sm font-semibold">{shop.name}</p>
                <p className="text-xs text-muted-foreground">Proprietário</p>
              </div>
            </div>
          </header>
          <main className="px-4 py-6 sm:px-8 sm:py-8">
            <Outlet />
          </main>
        </div>
      </div>
    </NotificationsProvider>
  );
}
