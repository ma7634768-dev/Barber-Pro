// Barber Pro: recebe os avisos da Kiwify e ativa/renova/cancela o plano da barbearia.
// Secrets necessários no Supabase: KIWIFY_TOKEN (o "token" do webhook na Kiwify;
// se houver um webhook por produto, os tokens separados por vírgula).
// SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY já existem em toda Edge Function.
// Publicar com "Verify JWT" DESLIGADO (a Kiwify não manda login do Supabase).

const PRICES: Record<string, number> = { basico: 39, pro: 70, business: 129 };

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const KIWIFY_TOKENS = (Deno.env.get("KIWIFY_TOKEN") ?? "").split(",").map((t) => t.trim()).filter(Boolean);

const db = (path: string, init: RequestInit = {}) =>
  fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json", ...(init.headers ?? {}) },
  });

async function hmacSha1Hex(key: string, message: string) {
  const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(key), { name: "HMAC", hash: "SHA-1" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(message));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

const normalize = (s: unknown) => String(s ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

function planFrom(body: any) {
  const name = normalize([body.Product?.product_name, body.Subscription?.plan?.name].join(" "));
  if (name.includes("business")) return "business";
  if (name.includes("basico")) return "basico";
  return "pro";
}

function eventFrom(body: any): string {
  if (body.webhook_event_type) return body.webhook_event_type;
  switch (body.order_status) {
    case "paid": return "order_approved";
    case "refunded": return "order_refunded";
    case "chargedback": return "chargeback";
    default: return String(body.order_status ?? "unknown");
  }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function findShop(body: any): Promise<string | null> {
  // 1) o site manda o id da barbearia no link do checkout (?sck=...)
  const sck = body.TrackingParameters?.sck;
  if (sck && UUID.test(sck)) {
    const r = await db(`barbershops?id=eq.${sck}&select=id`);
    const rows = await r.json();
    if (rows.length) return rows[0].id;
  }
  // 2) senão, pelo e-mail de quem comprou = e-mail da conta do dono
  const email = normalize(body.Customer?.email).trim();
  if (!email) return null;
  const p = await (await db(`profiles?email=ilike.${encodeURIComponent(email)}&select=user_id`)).json();
  if (!p.length) return null;
  const s = await (await db(`barbershops?owner_id=eq.${p[0].user_id}&select=id&order=created_at&limit=1`)).json();
  return s[0]?.id ?? null;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("ok");
  const raw = await req.text();
  const url = new URL(req.url);

  const signature = url.searchParams.get("signature") ?? "";
  const valid = (await Promise.all(KIWIFY_TOKENS.map((t) => hmacSha1Hex(t, raw)))).includes(signature);
  if (!signature || !valid) {
    return new Response("assinatura inválida", { status: 401 });
  }

  let body: any;
  try {
    body = JSON.parse(raw);
  } catch {
    return new Response("json inválido", { status: 400 });
  }

  const event = eventFrom(body);
  const plan = planFrom(body);
  const status =
    ["order_approved", "subscription_renewed"].includes(event) ? "active"
    : event === "subscription_late" ? "late"
    : event === "subscription_canceled" ? "canceled"
    : ["order_refunded", "chargeback"].includes(event) ? "refunded"
    : null;
  // Boleto/Pix gerado, carrinho abandonado etc. não mudam o plano
  if (!status) return new Response("ignorado");

  const shopId = await findShop(body);
  const orderId = String(body.order_id ?? body.subscription_id ?? crypto.randomUUID());

  if (status === "active" || status === "refunded") {
    await db("invoices?on_conflict=kiwify_order_id,event", {
      method: "POST",
      headers: { Prefer: "resolution=ignore-duplicates" },
      body: JSON.stringify({
        barbershop_id: shopId,
        kiwify_order_id: orderId,
        event,
        plan,
        amount: PRICES[plan],
        payment_method: body.payment_method ?? null,
        status: status === "active" ? "paid" : "refunded",
        customer_email: body.Customer?.email ?? null,
      }),
    });
  }

  if (!shopId) return new Response("barbearia não encontrada (fatura guardada)");

  const next = body.Subscription?.next_payment ? new Date(body.Subscription.next_payment) : null;
  const periodEnd = status === "active" ? (next && !isNaN(+next) ? next : new Date(Date.now() + 31 * 864e5)).toISOString() : undefined;

  const kiwifySubId = body.subscription_id ?? body.Subscription?.id;
  const r = await db("subscriptions?on_conflict=barbershop_id", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates" },
    body: JSON.stringify({
      barbershop_id: shopId,
      plan,
      status,
      ...(kiwifySubId ? { kiwify_subscription_id: String(kiwifySubId) } : {}),
      ...(periodEnd ? { current_period_end: periodEnd } : {}),
      updated_at: new Date().toISOString(),
    }),
  });
  if (!r.ok) return new Response(await r.text(), { status: 500 });
  return new Response("ok");
});
