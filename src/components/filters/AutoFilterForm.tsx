"use client";

import { useEffect, useRef, useTransition, type FormEvent, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import Icon from "@/components/recruiter/Icon";

type AutoFilterFormProps = {
  children: ReactNode;
  resetHref: string;
  className?: string;
  ariaLabel?: string;
  resultCount?: number;
  resultNoun?: string;
  debounceMs?: number;
};

export default function AutoFilterForm({
  children,
  resetHref,
  className = "",
  ariaLabel = "Filtres",
  resultCount,
  resultNoun = "résultat",
  debounceMs = 350,
}: AutoFilterFormProps) {
  const router = useRouter();
  const pathname = usePathname();
  const formRef = useRef<HTMLFormElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  function navigate(form: HTMLFormElement) {
    const params = new URLSearchParams();
    new FormData(form).forEach((value, key) => {
      if (typeof value !== "string") return;
      const normalized = value.trim();
      if (normalized) params.set(key, normalized);
    });
    const query = params.toString();
    startTransition(() => router.replace(`${pathname}${query ? `?${query}` : ""}`, { scroll: false }));
  }

  function schedule(form: HTMLFormElement, immediate: boolean) {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (immediate) navigate(form);
    else timerRef.current = setTimeout(() => navigate(form), debounceMs);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    schedule(event.currentTarget, true);
  }

  function reset() {
    if (timerRef.current) clearTimeout(timerRef.current);
    formRef.current?.reset();
    startTransition(() => router.replace(resetHref, { scroll: false }));
  }

  return <form
    ref={formRef}
    method="GET"
    className={`qj-filter-bar${className ? ` ${className}` : ""}`}
    aria-label={ariaLabel}
    aria-busy={pending}
    onSubmit={submit}
    onChange={event => {
      const target = event.target;
      const immediate = target instanceof HTMLSelectElement || (target instanceof HTMLInputElement && ["date", "month", "checkbox", "radio"].includes(target.type));
      schedule(event.currentTarget, immediate);
    }}
  >
    {children}
    <div className="qj-filter-actions">
      {resultCount !== undefined && <output className="qj-filter-count" aria-live="polite">
        {pending ? "Mise à jour…" : `${resultCount.toLocaleString("fr-FR")} ${resultNoun}${resultCount !== 1 ? "s" : ""}`}
      </output>}
      {resultCount === undefined && <span className="qj-filter-pending" aria-live="polite">{pending ? "Mise à jour…" : ""}</span>}
      <button type="button" className="rq-button qj-filter-reset" onClick={reset}><Icon name="close" size={15} />Réinitialiser</button>
    </div>
    <button type="submit" className="sr-only">Appliquer les filtres</button>
  </form>;
}
