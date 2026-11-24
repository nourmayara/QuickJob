"use client";
import Image from "next/image";
import { useState } from "react";
import { profileImageSchema } from "@/lib/profile-validation";

export default function ProfileImageInput({ initialValue, label }: { initialValue: string | null; label: string }) {
  const [value, setValue] = useState(initialValue || "");
  const [error, setError] = useState("");
  return <div className="rq-field rq-span-2 qj-profile-image-field"><span>{label}</span><div className="qj-profile-image-control">{value && <Image unoptimized src={value} alt={label} width={72} height={72} />}<label className="qj-profile-upload">Choisir une image<input type="file" accept="image/png,image/jpeg,image/webp" onChange={async event => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    setError(""); if (!file) return;
    if (file.size > 262144) { setError("Image trop volumineuse (256 Ko maximum)"); input.value = ""; return; }
    try {
      const result = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsDataURL(file); });
      const parsed = profileImageSchema.safeParse(result);
      if (!parsed.success) { setError(parsed.error.issues[0].message); return; }
      setValue(result);
    } catch { setError("Lecture de l’image impossible"); }
    finally { input.value = ""; }
  }} /></label>{value && <button type="button" className="rq-button" onClick={() => setValue("")}>Supprimer</button>}</div><small>PNG, JPEG ou WebP, 256 Ko maximum. Enregistrez pour confirmer.</small><input type="hidden" name="avatarUrl" value={value} />{error && <p className="rq-error" role="alert">{error}</p>}</div>;
}
