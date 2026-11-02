import { requirePageRole } from "@/lib/authorization";
import prisma from "@/lib/prisma";
import { listInput } from "@/lib/admin-validation";
import { categoryKey } from "@/lib/category-name";
import { PageHeading, Panel } from "@/components/recruiter/ui";
import CategoryManager from "@/components/admin/CategoryManager";
import AdminPagination from "@/components/admin/AdminPagination";
export default async function CategoriesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requirePageRole(["ADMIN"]); const parsed = listInput.safeParse(await searchParams), input = parsed.success ? parsed.data : listInput.parse({});
  const where = input.q ? { name: { contains: input.q } } : {};
  const [items, total, usage] = await Promise.all([prisma.category.findMany({ where, orderBy: { name: "asc" }, take: 25, skip: (input.page - 1) * 25 }), prisma.category.count({ where }), prisma.mission.groupBy({ by: ["category"], _count: { _all: true } })]);
  const counts = new Map<string, number>(); for (const m of usage) if (m.category) { const key = categoryKey(m.category); counts.set(key, (counts.get(key) || 0) + m._count._all); }
  return <><PageHeading title="Catégories" description="Créez, renommez ou désactivez les catégories. Aucune suppression définitive n’est proposée afin de préserver les missions." /><form className="rq-filters" method="GET"><label className="rq-field">Recherche<input name="q" maxLength={160} defaultValue={input.q} /></label><button className="rq-button rq-primary">Rechercher</button></form>{!parsed.success && <p role="alert" className="rq-error">Filtres invalides.</p>}<Panel title={`${total} catégorie(s)`}><CategoryManager categories={items.map(c => ({ id: c.id, name: c.name, active: c.active, usage: counts.get(c.key) || 0 }))} /><AdminPagination page={input.page} total={total} query={{ q: input.q }} /></Panel></>;
}
