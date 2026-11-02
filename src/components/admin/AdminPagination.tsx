import Link from "next/link";
export default function AdminPagination({ page, total, query }: { page: number; total: number; query: Record<string, string> }) {
  const href = (p: number) => `?${new URLSearchParams({ ...query, page: String(p) })}`;
  return <nav className="qa-pagination" aria-label="Pagination">{page > 1 ? <Link href={href(page - 1)}>Précédent</Link> : <span />}<span>Page {page} · {total} résultat(s)</span>{page * 25 < total ? <Link href={href(page + 1)}>Suivant</Link> : <span />}</nav>;
}
