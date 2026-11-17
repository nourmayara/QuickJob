import Link from "next/link";

export default function AdminPagination({ page, total, query, pageSize = 25 }: { page: number; total: number; query: Record<string, string>; pageSize?: number }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(page, pages);
  const href = (target: number) => `?${new URLSearchParams({ ...query, page: String(target) })}`;
  const visible = Array.from({ length: pages }, (_, index) => index + 1).filter(target => target === 1 || target === pages || Math.abs(target - current) <= 1);

  return <nav className="qa-pagination" aria-label="Pagination">
    <span>Page {current} sur {pages} · {total} résultat{total > 1 ? "s" : ""}</span>
    <div>
      {current > 1 && <Link href={href(current - 1)} aria-label="Page précédente">‹</Link>}
      {visible.map((target, index) => <span key={target} className="qa-page-item">{index > 0 && target - visible[index - 1] > 1 && <i>…</i>}<Link href={href(target)} aria-current={target === current ? "page" : undefined}>{target}</Link></span>)}
      {current < pages && <Link href={href(current + 1)} aria-label="Page suivante">›</Link>}
    </div>
  </nav>;
}
