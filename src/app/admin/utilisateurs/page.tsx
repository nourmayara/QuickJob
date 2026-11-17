import Link from "next/link";
import { requirePageRole } from "@/lib/authorization";
import { usersFilter } from "@/lib/admin-validation";
import { listAdminUsers } from "@/lib/admin-service";
import { formatDate } from "@/components/recruiter/ui";
import AdminPagination from "@/components/admin/AdminPagination";
import Icon from "@/components/recruiter/Icon";
import SoftIcon from "@/components/SoftIcon";
import AutoFilterForm from "@/components/filters/AutoFilterForm";

const roleLabels: Record<string, string> = { TRAVAILLEUR: "Travailleur", RECRUTEUR: "Recruteur", ADMIN: "Admin" };
const verificationLabels: Record<string, string> = { APPROUVE: "Approuvé", EN_ATTENTE: "En attente", REFUSE: "Refusé" };

export default async function UsersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requirePageRole(["ADMIN"]);
  const parsed = usersFilter.safeParse(await searchParams);
  const input = parsed.success ? parsed.data : usersFilter.parse({});
  const { items, total } = await listAdminUsers(input);

  return <div className="qa-users-page">
    <header className="qa-users-header">
      <SoftIcon name="people" size={28} />
      <div><h1>Gestion des utilisateurs</h1><p>Gérez les comptes et les accès de la plateforme QuickJob.</p></div>
      <span className="qa-users-total"><strong>{total.toLocaleString("fr-FR")}</strong><small>utilisateur{total > 1 ? "s" : ""}</small></span>
    </header>

    {!parsed.success && <p role="alert" className="rq-error">Filtres invalides.</p>}
    <AutoFilterForm key={JSON.stringify(input)} resetHref="/admin/utilisateurs" ariaLabel="Filtrer les utilisateurs">
      <label className="qj-filter-field qj-filter-search"><span>Recherche</span><div><Icon name="search" size={17} /><input type="search" name="q" defaultValue={input.q} maxLength={160} placeholder="Nom, email ou organisation…" /></div></label>
      <label className="qj-filter-field"><span>Rôle</span><select name="role" defaultValue={input.role}><option value="">Tous</option>{["TRAVAILLEUR", "RECRUTEUR", "ADMIN"].map(role => <option key={role} value={role}>{roleLabels[role]}</option>)}</select></label>
      <label className="qj-filter-field"><span>Compte</span><select name="status" defaultValue={input.status}><option value="">Tous</option><option value="ACTIF">Actif</option><option value="SUSPENDU">Suspendu</option></select></label>
    </AutoFilterForm>

    <section className="qa-users-card" aria-labelledby="users-table-title">
      <div className="qa-users-card-heading"><div><h2 id="users-table-title">{total.toLocaleString("fr-FR")} utilisateur{total > 1 ? "s" : ""}</h2><p>Comptes correspondant aux critères sélectionnés</p></div></div>
      <div className="qa-table qa-users-table"><table><thead><tr>{["Identité", "Email", "Rôle", "Compte", "Vérification", "Inscription", "Action"].map(label => <th scope="col" key={label}>{label}</th>)}</tr></thead><tbody>{items.map(user => {
        const initials = `${user.firstName?.[0] ?? ""}${user.name?.[0] ?? ""}`.toUpperCase() || "?";
        const verification = user.recruiterVerification?.status || "EN_ATTENTE";
        return <tr key={user.id}>
          <td><div className="qa-user-identity"><span className={`qa-user-avatar qa-avatar-${user.role.toLowerCase()}`}>{initials}</span><div><strong>{user.firstName} {user.name}</strong>{user.companyName && <small>{user.companyName}</small>}</div></div></td>
          <td className="qa-user-email">{user.email}</td>
          <td><span className={`qa-user-badge qa-role-${user.role.toLowerCase()}`}>{roleLabels[user.role] || user.role}</span></td>
          <td><span className={`qa-user-badge ${user.suspended ? "qa-account-suspended" : "qa-account-active"}`}><i />{user.suspended ? "Suspendu" : "Actif"}</span></td>
          <td>{user.role === "RECRUTEUR" ? <span className={`qa-user-badge qa-verification-${verification.toLowerCase()}`}>{verificationLabels[verification] || verification}</span> : <span className="qa-user-muted">—</span>}</td>
          <td>{formatDate(user.createdAt)}</td>
          <td><Link className="qa-user-view" href={`/admin/utilisateurs/${user.id}`}><Icon name="eye" size={15} />Consulter</Link></td>
        </tr>;
      })}</tbody></table>{!items.length && <p className="qa-empty">Aucun utilisateur correspondant.</p>}</div>
      <AdminPagination page={input.page} total={total} pageSize={10} query={{ q: input.q, role: input.role, status: input.status }} />
    </section>
  </div>;
}
