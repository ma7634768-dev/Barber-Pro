export type PlanId = "basico" | "pro" | "business";

export type Plan = {
  id: PlanId;
  /** Link de checkout do produto na Kiwify (vazio = ainda não configurado) */
  checkoutUrl: string;
  name: string;
  tagline: string;
  price: number;
  popular?: boolean;
  maxBarbers: number | null;
  features: string[];
};

export const PLANS: Plan[] = [
  {
    id: "basico",
    checkoutUrl: "https://pay.kiwify.com.br/V6u2PKg",
    name: "Básico",
    tagline: "Ideal para barbearias iniciantes",
    price: 39,
    maxBarbers: 2,
    features: ["Até 2 barbeiros", "Agendamentos ilimitados", "Página de agendamento", "Gestão de clientes", "Suporte por email"],
  },
  {
    id: "pro",
    checkoutUrl: "https://pay.kiwify.com.br/op0h1uA",
    name: "Pro",
    tagline: "Para barbearias em crescimento",
    price: 70,
    popular: true,
    maxBarbers: 5,
    features: ["Até 5 barbeiros", "Tudo do plano Básico", "Produtos e estoque", "Notificações em tempo real", "Suporte prioritário"],
  },
  {
    id: "business",
    checkoutUrl: "",
    name: "Business",
    tagline: "Para redes de barbearias",
    price: 129,
    maxBarbers: null,
    features: ["Barbeiros ilimitados", "Tudo do plano Pro", "Gestão de equipe", "Suporte 24/7", "Customização de marca"],
  },
];

export const planById = (id: string | null | undefined) => PLANS.find((p) => p.id === id);

/** Link do checkout com o id da barbearia, para o site saber quem pagou. */
export const checkoutLink = (plan: Plan, shopId: string, email?: string | null) => {
  if (!plan.checkoutUrl) return null;
  const url = new URL(plan.checkoutUrl);
  url.searchParams.set("sck", shopId);
  if (email) url.searchParams.set("email", email);
  return url.toString();
};
