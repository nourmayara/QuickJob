import Link from "next/link";

export default function Pagination({ page, total, pageSize = 20, query = {}, ariaLabel = "Pagination" }: { page: number; total: number; pageSize?: number; query?: Record<string, string | undefined>; ariaLabel?: string }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  const href = (target: number) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries({ ...query, page: String(target) })) if (value) params.set(key, value);
    return `?${params}`;
  };
  return <nav className="rq-pagination" aria-label={ariaLabel}>
    {page > 1 ? <Link className="rq-button" href={href(page - 1)}>Précédent</Link> : <span />}
    <span>Page {page} / {pages}</span>
    {page < pages ? <Link className="rq-button" href={href(page + 1)}>Suivant</Link> : <span />}
  </nav>;
}
