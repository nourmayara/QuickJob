"use client";
import Image from "next/image";
import SoftIcon from "@/components/SoftIcon";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import AuthForm from "@/components/AuthForm";
import QuickJobLogo from "@/components/QuickJobLogo";
import { authHref, parseJourney } from "@/lib/journey";
import "./auth.css";
import "./auth-experience.css";
import "./auth-pastel.css";
import "./login-design.css";
import "./role-selection.css";
import "./registration-polish.css";

type Mode = "login" | "register";
type Role = "TRAVAILLEUR" | "RECRUTEUR";

export default function AuthExperience({ children }: { children: ReactNode }) {
  const mode: Mode = usePathname() === "/register" ? "register" : "login";
  const intent = parseJourney(useSearchParams().get("intent"));
  const previousMode = useRef(mode);
  const container = useRef<HTMLElement>(null);
  const presentation = useRef<HTMLElement>(null);
  const [selection, setSelection] = useState<{ intent: typeof intent; role: Role }>({ intent, role: intent === "recruteur" ? "RECRUTEUR" : "TRAVAILLEUR" });
  const role = selection.intent === intent ? selection.role : intent === "recruteur" ? "RECRUTEUR" : "TRAVAILLEUR";
  function setRole(nextRole: Role) { setSelection({ intent, role: nextRole }); }
  const [stepState, setStepState] = useState({ intent, step: 1 });
  const registerStep = stepState.intent === intent ? stepState.step : 1;
  function setRegisterStep(step: number) { setStepState({ intent, step }); }
  const [busy, setBusy] = useState(false);
  const [moving, setMoving] = useState(false);
  const recruiter = mode === "register" && role === "RECRUTEUR";

  useEffect(() => {
    if (previousMode.current === mode) return;
    previousMode.current = mode;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const mobile = window.matchMedia("(max-width: 850px)").matches;
    setMoving(!reduced);
    const panel = presentation.current;
    function finish() {
      window.clearTimeout(timer);
      panel?.removeEventListener("transitionend", onTransitionEnd);
      setMoving(false);
      container.current?.querySelector<HTMLElement>(`[data-form-mode="${mode}"] h1`)?.focus({ preventScroll: !mobile });
    }
    function onTransitionEnd(event: TransitionEvent) {
      if (event.target === panel && event.propertyName === "transform") finish();
    }
    // Follow the actual transition, including a reversal before it has finished.
    panel?.addEventListener("transitionend", onTransitionEnd);
    const timer = window.setTimeout(finish, reduced ? 0 : mobile ? 240 : 880);
    return () => { window.clearTimeout(timer); panel?.removeEventListener("transitionend", onTransitionEnd); };
  }, [mode]);

  function switchLink(target: Mode, label: string, className = "") {
    return <Link href={authHref(target, intent)} scroll={false} className={className} aria-disabled={busy || undefined} tabIndex={busy ? -1 : undefined} onNavigate={event => { if (busy) event.preventDefault(); }}>{label}<span aria-hidden="true"> ↗</span></Link>;
  }

  return <main ref={container} className="auth-page auth-experience" data-mode={mode} data-register-step={mode === "register" ? registerStep : undefined} data-moving={moving} aria-label="Connexion et inscription QuickJob">
    {mode === "register" && registerStep === 1 && <>
      <Link href="/" className="role-home-back" aria-label="Retour à l’accueil"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m14 6-6 6 6 6M8 12h12" /></svg></Link>
    </>}
    {(["login", "register"] as const).map(view => <section key={view} className={`auth-panel auth-exp-side auth-exp-${view}`} data-form-mode={view} data-step={view === "register" ? registerStep : undefined} aria-hidden={mode !== view} inert={mode !== view} aria-labelledby={`auth-${view}-title`}>
      <header className="auth-header"><Link href="/" className="auth-brand" aria-label="QuickJob, accueil"><QuickJobLogo priority /></Link><Link href="/" className="auth-home">Retour à l’accueil ↗</Link></header>
      <div className="auth-exp-body"><div className="auth-content">
        <p className="auth-eyebrow"><span />{view === "login" ? "BON RETOUR" : registerStep === 2 ? "VOS INFORMATIONS" : "REJOIGNEZ QUICKJOB"}</p>
        <h1 id={`auth-${view}-title`} tabIndex={-1}>{view === "login" ? <>Se connecter</> : registerStep === 2 ? <>Créez votre compte</> : <>Rejoignez<br />QuickJob !</>}</h1>
        <p className="auth-description">{view === "login" ? "Accédez à votre espace QuickJob" : registerStep === 2 ? "Quelques informations et l’aventure commence." : "Choisissez votre profil pour commencer l’aventure."}</p>
        <AuthForm key={intent ?? "default"} intent={intent} mode={view} disabled={mode !== view || moving || busy} onRoleChange={setRole} onBusyChange={setBusy} onStepChange={view === "register" ? setRegisterStep : undefined} />
        <p className="auth-switch">{view === "login" ? "Nouveau sur QuickJob ? " : "Déjà inscrit ? "}{switchLink(view === "login" ? "register" : "login", view === "login" ? "Créer un compte" : "Se connecter")}</p>
      </div></div>
      <footer className="auth-footer"><span>À votre rythme. Avec les bonnes personnes.</span><span>© {new Date().getFullYear()} QuickJob</span></footer>
    </section>)}
    <aside ref={presentation} className={`auth-exp-presentation ${recruiter ? "is-recruiter" : "is-worker"}`} aria-label="Découvrez QuickJob">
      {mode === "login" && <Link href="/" className="auth-login-brand" aria-label="QuickJob, accueil"><QuickJobLogo priority /></Link>}
      <div className="auth-exp-presentation-content">
        {(["login", "register"] as const).map(view => <div key={view} className={`auth-exp-intro auth-exp-intro-${view}`} aria-hidden={mode !== view} inert={mode !== view}>
          <p className="auth-exp-label"><span /> DES POSSIBILITÉS, À VOTRE RYTHME</p>
          <h2>{view === "login" ? <>Bon retour ! <SoftIcon name="user" size={22} /></> : <>À vous de jouer !</>}</h2>
          <p className="auth-exp-description">{view === "login" ? "Content de vous revoir" : "Votre prochaine opportunité commence ici."}</p>
          {switchLink(view === "login" ? "register" : "login", view === "login" ? "Créer un compte" : "Se connecter", "auth-exp-toggle")}
        </div>)}
      </div>
      <div className="auth-exp-illustrations">
        <div className="auth-exp-ground" aria-hidden="true" />
        <Image className="auth-exp-illustration auth-exp-worker" src={mode === "login" ? "/images/login-laptop-clay.png" : "/images/worker-illustration-v2.png"} alt={mode === "login" ? "Personnage souriant en sweat bleu utilisant son ordinateur portable, avec une plante et une tasse de café" : "Jeune travailleur consultant des missions sur son smartphone"} fill sizes="(max-width: 650px) 85vw, 45vw" priority aria-hidden={recruiter} />
        <Image className="auth-exp-illustration auth-exp-recruiter" src="/images/recruiter-illustration-v2.png" alt="Recruteur professionnel consultant les profils de son équipe" fill sizes="(max-width: 850px) 0px, 45vw" priority aria-hidden={!recruiter} />
      </div>
      <p className="auth-exp-caption" aria-live="polite">{recruiter ? "Publiez vos missions et trouvez les bons profils." : "Trouvez des missions adaptées à votre rythme."}</p>
    </aside>
    {children}
  </main>;
}
