"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import styles from "./ContractDialog.module.css";

export default function ContractDialog({ mission, status, children, actions }: {
  mission: string;
  status: string;
  children: ReactNode;
  actions: ReactNode;
}) {
  const id = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const statusText = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (dialog.current?.open && document.activeElement === document.body) {
      statusText.current?.focus({ preventScroll: true });
    }
  }, [status]);

  return <>
    <button ref={trigger} type="button" className="rq-button" aria-haspopup="dialog" aria-controls={id} onClick={() => {
      dialog.current?.showModal();
      heading.current?.focus({ preventScroll: true });
      if (content.current) content.current.scrollTop = 0;
    }}>Voir le contrat</button>
    <dialog id={id} ref={dialog} aria-labelledby={`${id}-title`} className={styles.dialog}
      onClose={() => trigger.current?.focus({ preventScroll: true })}>
      <div className={styles.layout}>
        <header className={styles.header}>
          <div className="min-w-0">
            <h2 id={`${id}-title`} ref={heading} tabIndex={-1} className="text-lg font-semibold">Contrat électronique</h2>
            <p className="mt-1 break-words text-sm">{mission}</p>
            <p ref={statusText} tabIndex={-1} role="status" className="mt-1 text-sm font-medium">{status}</p>
          </div>
          <button type="button" className={`rq-button ${styles.close}`} aria-label="Fermer le contrat"
            onClick={() => dialog.current?.close()}><span aria-hidden="true">×</span></button>
        </header>
        <div ref={content} className={styles.content} tabIndex={0} role="region" aria-label="Contenu du contrat">
          {children}
        </div>
        <footer className={styles.footer}>{actions}</footer>
      </div>
    </dialog>
  </>;
}
