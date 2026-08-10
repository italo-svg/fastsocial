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

interface PlansFile {
  plans: Plan[];
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

  for (const plan of file.plans) {
    if (plan.stripePriceId) {
      try {
        const existingPrice = await stripe.prices.retrieve(plan.stripePriceId);
        if (existingPrice.active) {
          console.log(`[${plan.key}] já existe e está ativo (${plan.stripePriceId}) — pulando.`);
          continue;
        }
      } catch {
        console.log(`[${plan.key}] stripePriceId gravado (${plan.stripePriceId}) não encontrado no Stripe — recriando.`);
      }
    }

    const product = await stripe.products.create({
      name: plan.name,
      metadata: { planKey: plan.key },
    });
    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: plan.priceMonthlyCents,
      currency: plan.currency,
      recurring: { interval: "month" },
      metadata: { planKey: plan.key },
    });

    plan.stripeProductId = product.id;
    plan.stripePriceId = price.id;
    console.log(`[${plan.key}] criado: product=${product.id} price=${price.id}`);
  }

  writeFileSync(PLANS_PATH, JSON.stringify(file, null, 2) + "\n");
  console.log(`plans.json atualizado em ${PLANS_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
