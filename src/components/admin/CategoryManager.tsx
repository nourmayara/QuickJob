"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
type Category = { id: number; name: string; active: boolean; usage: number };
export default function CategoryManager({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Category | null>(null), [pending, setPending] = useState(false), [error, setError] = useState(""), [saved, setSaved] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (pending) return;
    const form = event.currentTarget, data = new FormData(form);
    setPending(true); setError(""); setSaved(false);
    try {
      const response = await fetch(`/api/admin/categories${selected ? `/${selected.id}` : ""}`, { method: selected ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: data.get("name"), active: data.get("active") === "on", ...(selected ? { expectedName: selected.name, expectedActive: selected.active } : {}) }) });
      const result = await response.json();
      if (!response.ok) { setError(result.error || "Enregistrement impossible"); return; }
      setSaved(true); setSelected(null); form.reset(); router.refresh();
    } catch { setError("Connexion au serveur impossible"); }
    finally { setPending(false); }
  }
  return <><div className="qa-table"><table><thead><tr><th>Catégorie</th><th>Statut</th><th>Missions utilisant ce libellé</th><th>Action</th></tr></thead><tbody>{categories.map(c => <tr key={c.id}><td>{c.name}</td><td>{c.active ? "Active" : "Désactivée"}</td><td>{c.usage}</td><td><button className="rq-button" onClick={() => { setSelected(c); setError(""); setSaved(false); }}>Modifier</button></td></tr>)}</tbody></table>{categories.length === 0 && <p className="qa-empty">Aucune catégorie correspondant à la recherche.</p>}</div><form className="rq-form" key={selected ? `${selected.id}-${selected.name}-${selected.active}` : "new"} onSubmit={submit}><h2>{selected ? "Modifier la catégorie" : "Créer une catégorie"}</h2><p className="rq-subtle">Renommer actualise le libellé des missions existantes. Désactiver empêche les nouvelles utilisations sans supprimer les missions.</p><label className="rq-field">Nom<input name="name" required minLength={2} maxLength={100} defaultValue={selected?.name || ""} disabled={pending} /></label><label><input type="checkbox" name="active" defaultChecked={selected?.active ?? true} disabled={pending} /> Catégorie active</label><div className="rq-form-actions"><button className="rq-button rq-primary" disabled={pending}>{pending ? "Enregistrement…" : "Enregistrer la catégorie"}</button>{selected && <button className="rq-button" type="button" onClick={() => setSelected(null)}>Annuler</button>}</div>{error && <p className="rq-error" role="alert">{error}</p>}{saved && <p className="rq-success" role="status">Catégorie enregistrée.</p>}</form></>;
}
