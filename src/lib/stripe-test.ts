import "server-only";
import Stripe from "stripe";

export function stripeTestClient() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key?.startsWith("sk_test_")) throw new Error("Une clé Stripe secrète de test est requise.");
  return new Stripe(key);
}

// Simulation 1 DT = 1 EUR, arrondie au centime. Les contrats restent libellés en TND.
export const stripeTestCurrency = "eur";
export function stripeTestAmount(totalMillimes: number) {
  return Math.floor((totalMillimes + 5) / 10);
}
