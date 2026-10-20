"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
export default function RefreshStatus() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return <button className="rq-button" disabled={pending} onClick={() => startTransition(() => router.refresh())}>{pending ? "Actualisation…" : "Actualiser les statuts"}</button>;
}
