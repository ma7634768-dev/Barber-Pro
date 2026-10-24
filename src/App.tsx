import type { ReactNode } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useAuth } from "./lib/auth";
import { BarbershopProvider } from "./lib/barbershop";
import { isSupabaseConfigured } from "./lib/supabase";
import { DashboardLayout } from "./components/DashboardLayout";
import { Spinner } from "./components/ui";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import Onboarding from "./pages/Onboarding";
import Booking from "./pages/Booking";
import NotFound from "./pages/NotFound";
import Overview from "./pages/dashboard/Overview";
import Agenda from "./pages/dashboard/Agenda";
import Barbers from "./pages/dashboard/Barbers";
import Services from "./pages/dashboard/Services";
import Clients from "./pages/dashboard/Clients";
import Settings from "./pages/dashboard/Settings";

function RequireAuth({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Spinner />;
  if (!session) return <Navigate to="/entrar" replace state={{ from: location.pathname }} />;
  return <BarbershopProvider>{children}</BarbershopProvider>;
}

export default function App() {
  return (
    <>
      {!isSupabaseConfigured && (
        <div className="bg-destructive/90 px-4 py-2 text-center text-sm text-white">
          Supabase não configurado: crie o arquivo .env com VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.
        </div>
      )}
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/entrar" element={<Auth />} />
        <Route path="/agendar/:shopId" element={<Booking />} />
        <Route path="/comecar" element={<RequireAuth><Onboarding /></RequireAuth>} />
        <Route path="/painel" element={<RequireAuth><DashboardLayout /></RequireAuth>}>
          <Route index element={<Overview />} />
          <Route path="agenda" element={<Agenda />} />
          <Route path="barbeiros" element={<Barbers />} />
          <Route path="servicos" element={<Services />} />
          <Route path="clientes" element={<Clients />} />
          <Route path="configuracoes" element={<Settings />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}
