import Link from "next/link";
import { requirePageRole } from "@/lib/authorization";
import prisma from "@/lib/prisma";
import { pageNumber } from "@/lib/recruiter-data";
import { PageHeading, Panel } from "@/components/recruiter/ui";
import NotificationCenter from "@/components/communication/NotificationCenter";
export default async function NotificationsPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const user = await requirePageRole(["TRAVAILLEUR"]);
  const page = pageNumber((await searchParams).page);
  const [items, unread, total] = await Promise.all([
    prisma.notification.findMany({ where: { userId: user.id }, select: { id: true, message: true, createdAt: true, readAt: true }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 20, skip: (page - 1) * 20 }),
    prisma.notification.count({ where: { userId: user.id, readAt: null } }), prisma.notification.count({ where: { userId: user.id } }),
  ]);
  return <><PageHeading title="Mes notifications" description="Suivez les réponses aux candidatures, les changements de missions et vos nouveaux messages." /><Panel title="Notifications"><NotificationCenter unread={unread} items={items.map(n => ({ ...n, createdAt: n.createdAt.toISOString(), readAt: n.readAt?.toISOString() || null }))} /></Panel>{total > 20 && <div className="rq-pagination">{page > 1 && <Link className="rq-button" href={`?page=${page - 1}`}>Précédent</Link>}<span>Page {page}</span>{page * 20 < total && <Link className="rq-button" href={`?page=${page + 1}`}>Suivant</Link>}</div>}</>;
}
