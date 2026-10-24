export type Plan = { name: string; tagline: string; price: number; popular?: boolean; maxBarbers: number | null; features: string[] };

export const PLANS: Plan[] = [
  {
    name: "Básico",
    tagline: "Ideal para barbearias iniciantes",
    price: 39,
    maxBarbers: 2,
    features: ["Até 2 barbeiros", "Agendamentos ilimitados", "Página de agendamento", "Gestão de clientes", "Suporte por email"],
  },
  {
    name: "Pro",
    tagline: "Para barbearias em crescimento",
    price: 70,
    popular: true,
    maxBarbers: 5,
    features: ["Até 5 barbeiros", "Tudo do plano Básico", "Produtos e estoque", "Notificações em tempo real", "Suporte prioritário"],
  },
  {
    name: "Business",
    tagline: "Para redes de barbearias",
    price: 129,
    maxBarbers: null,
    features: ["Barbeiros ilimitados", "Tudo do plano Pro", "Gestão de equipe", "Suporte 24/7", "Customização de marca"],
  },
];
