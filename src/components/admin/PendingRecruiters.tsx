"use client";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
export default function PendingRecruiters() {
  const pathname = usePathname();
  const [count, setCount] = useState<number | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    async function refresh() { try { const response = await fetch("/api/admin/recruteurs?status=EN_ATTENTE&countOnly=1", { cache: "no-store", signal: controller.signal }); if (response.ok) setCount((await response.json()).total); } catch { /* The list is still accessible if the counter cannot load. */ } }
    void refresh(); window.addEventListener("quickjob:recruiters", refresh);
    return () => { controller.abort(); window.removeEventListener("quickjob:recruiters", refresh); };
  }, [pathname]);
  return <small aria-label={count === null ? "Chargement des demandes" : `${count} demande(s) en attente`}> ({count === null ? "…" : count})</small>;
}
