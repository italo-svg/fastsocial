// Script standalone (spec 040) — roda uma vez manualmente pelo operador para
// criar os Produtos/Preços no Stripe a partir de infra/billing/plans.json,
// em vez de configurar tudo clicando no painel da Stripe. Idempotente: se um
// plano já tem `stripePriceId` gravado em plans.json E esse Price ainda
// existe/está ativo no Stripe, pula a criação (CA-01 — rodar 2x não duplica).
//
// Uso: pnpm tsx scripts/setup-stripe-products.ts
import Stripe from "stripe";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

interface Plan {
  key: string;
  name: string;
  priceMonthlyCents: number;
  currency: string;
  maxSocialAccounts: number;
  maxPostsPerMonth: number;
  stripeProductId?: string;
  stripePriceId?: string;
}

// spec 053: add-ons pagos (ex: automação de Instagram) — mesma forma dos
// planos base, mas numa seção separada (nunca aparecem em GET /billing/plans,
// só em GET /addons) e cobrados como item adicional da assinatura existente,
// não uma assinatura nova.
interface AddonProduct {
  key: string;
  name: string;
  priceMonthlyCents: number;
  currency: string;
  stripeProductId?: string;
  stripePriceId?: string;
}

interface PlansFile {
  plans: Plan[];
  addons?: AddonProduct[];
}

const PLANS_PATH = resolve(__dirname, "../infra/billing/plans.json");

async function main(): Promise<void> {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    console.error("STRIPE_SECRET_KEY não configurada — abortando.");
    process.exit(1);
  }

  const stripe = new Stripe(secretKey);
  const file: PlansFile = JSON.parse(readFileSync(PLANS_PATH, "utf8"));

  async function ensureProduct(item: Plan | AddonProduct, metadataKey: string): Promise<void> {
    if (item.stripePriceId) {
      try {
        const existingPrice = await stripe.prices.retrieve(item.stripePriceId);
        if (existingPrice.active) {
          console.log(`[${item.key}] já existe e está ativo (${item.stripePriceId}) — pulando.`);
          return;
        }
      } catch {
        console.log(`[${item.key}] stripePriceId gravado (${item.stripePriceId}) não encontrado no Stripe — recriando.`);
      }
    }

    const product = await stripe.products.create({
      name: item.name,
      metadata: { [metadataKey]: item.key },
    });
    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: item.priceMonthlyCents,
      currency: item.currency,
      recurring: { interval: "month" },
      metadata: { [metadataKey]: item.key },
    });

    item.stripeProductId = product.id;
    item.stripePriceId = price.id;
    console.log(`[${item.key}] criado: product=${product.id} price=${price.id}`);
  }

  for (const plan of file.plans) {
    await ensureProduct(plan, "planKey");
  }
  for (const addon of file.addons ?? []) {
    await ensureProduct(addon, "addonKey");
  }

  writeFileSync(PLANS_PATH, JSON.stringify(file, null, 2) + "\n");
  console.log(`plans.json atualizado em ${PLANS_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
