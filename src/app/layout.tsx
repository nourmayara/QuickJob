import type { Metadata } from "next";
import "./globals.css";
import "./design-tokens.css";
import "./clay-foundation.css";
import "./clay-public.css";
import "./visual-refinements.css";
import "./icon-system.css";
export const metadata: Metadata = { title: "QuickJob — Votre prochaine opportunité commence ici", description: "Trouvez des missions ponctuelles en Tunisie, à votre rythme. QuickJob met en relation les talents et les recruteurs." };
export default function RootLayout({ children }: { children: React.ReactNode }) { return <html lang="fr"><body className="qj-clay">{children}</body></html>; }
