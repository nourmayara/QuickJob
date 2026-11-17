import { requirePageRole } from "@/lib/authorization";
import prisma from "@/lib/prisma";
import { listInput } from "@/lib/admin-validation";
import { categoryKey } from "@/lib/category-name";
import Icon from "@/components/recruiter/Icon";
import CategoryManager from "@/components/admin/CategoryManager";
import AdminPagination from "@/components/admin/AdminPagination";
import { AdminListCard, AdminPageHeader } from "@/components/admin/AdminUi";
export default async function CategoriesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requirePageRole(["ADMIN"]); const parsed = listInput.safeParse(await searchParams), input = parsed.success ? parsed.data : listInput.parse({}); const where = input.q ? { name: { contains: input.q } } : {};
  const [items, total, usage] = await Promise.all([prisma.category.findMany({ where, orderBy: { name: "asc" }, take: 25, skip: (input.page - 1) * 25 }), prisma.category.count({ where }), prisma.mission.groupBy({ by: ["category"], _count: { _all: true } })]); const counts = new Map<string, number>(); for (const mission of usage) if (mission.category) { const key = categoryKey(mission.category); counts.set(key, (counts.get(key) || 0) + mission._count._all); }
  return <main className="qa-admin-page"><AdminPageHeader icon="layers" title="Catégories" description="Gérez les catégories utilisées pour classer les missions." />
    <form className="qa-admin-filters qa-category-filters" method="GET"><label className="qa-admin-search"><span>Recherche</span><div><Icon name="search" size={18} /><input name="q" maxLength={160} defaultValue={input.q} placeholder="Rechercher une catégorie…" /></div></label><button className="rq-button rq-primary"><Icon name="search" size={17} />Rechercher</button></form>{!parsed.success && <p role="alert" className="rq-error">Filtres invalides.</p>}
    <AdminListCard title={`${total} catégorie${total !== 1 ? "s" : ""}`}><CategoryManager categories={items.map(category => ({ id: category.id, name: category.name, active: category.active, usage: counts.get(category.key) || 0 }))} /><AdminPagination page={input.page} total={total} query={{ q: input.q }} /></AdminListCard>
  </main>;
}
