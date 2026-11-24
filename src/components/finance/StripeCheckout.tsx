"use client";

import { useRef, useState, type FormEvent } from "react";
import { CardElement, Elements, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { useRouter } from "next/navigation";

const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const stripe = key?.startsWith("pk_test_") ? loadStripe(key) : null;

function CheckoutForm({ id, amount }: { id: number; amount: string }) {
  const client = useStripe();
  const elements = useElements();
  const router = useRouter();
  const lock = useRef(false);
  const [pending, setPending] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [message, setMessage] = useState("");

  async function pay(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const card = elements?.getElement(CardElement);
    if (!client || !card || lock.current || submitted) return;
    lock.current = true;
    setPending(true);
    setMessage("");
    try {
      const response = await fetch("/api/create-payment-intent", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ engagementId: id }),
      });
      const result = await response.json();
      if (!response.ok) { setMessage(result.error ?? "Paiement indisponible."); return; }
      const confirmation = await client.confirmCardPayment(
        result.clientSecret, result.requiresAction ? undefined : { payment_method: { card } },
      );
      if (confirmation.error) { setMessage(confirmation.error.message ?? "Paiement refusé. Réessayez."); return; }
      setSubmitted(true);
      setMessage("Tentative envoyée. Actualisez le suivi après la confirmation du serveur.");
      router.refresh();
    } catch {
      setMessage("Connexion impossible. Réessayez.");
    } finally {
      lock.current = false;
      setPending(false);
    }
  }

  return <form className="space-y-3" onSubmit={pay} aria-busy={pending}>
    <div className="rounded-lg border border-violet-200 bg-white p-3"><CardElement /></div>
    <button className="rq-button rq-primary" disabled={!client || pending || submitted}>{pending ? "Vérification…" : `Payer ${amount} en mode test`}</button>
    {message && <p role="status" className="text-sm">{message}</p>}
  </form>;
}

export default function StripeCheckout({ id, amount }: { id: number; amount: string }) {
  if (!stripe) return <p className="mt-3 text-sm">Le paiement de test nécessite une clé publique Stripe de test.</p>;
  return <details className="mt-3 space-y-3 rounded-lg bg-violet-50 p-3">
    <summary className="cursor-pointer">Payer avec Stripe</summary>
    <p className="text-sm">Montant transmis à Stripe {amount}. Simulation de 1 DT pour 1 EUR, avec arrondi au centime.</p>
    <Elements stripe={stripe}><CheckoutForm id={id} amount={amount} /></Elements>
  </details>;
}
