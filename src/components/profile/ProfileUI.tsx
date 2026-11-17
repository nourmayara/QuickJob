import Image from "next/image";
import type { ReactNode } from "react";
import { Avatar } from "@/components/recruiter/ui";
import "./profile-premium.css";

export function ProfileIdentityCard({ avatarUrl, name, role, details }: { avatarUrl: string | null; name: string; role: string; details?: ReactNode }) {
  return <section className="qj-profile-identity"><div className="qj-profile-avatar">{avatarUrl ? <Image unoptimized src={avatarUrl} alt={`Photo de ${name}`} width={92} height={92} /> : <Avatar name={name} />}</div><div className="qj-profile-identity-copy"><div><h2>{name}</h2><span>{role}</span></div>{details && <div className="qj-profile-identity-details">{details}</div>}</div></section>;
}

export function ProfileSection({ title, description, className = "", children }: { title: string; description?: string; className?: string; children: ReactNode }) {
  return <section className={`qj-profile-section ${className}`}><header><h2>{title}</h2>{description && <p>{description}</p>}</header><div className="qj-profile-section-body">{children}</div></section>;
}
