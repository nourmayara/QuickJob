import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "QuickJob — Votre prochaine opportunité commence ici", description: "Trouvez des missions ponctuelles en Tunisie, à votre rythme. QuickJob met en relation les talents et les recruteurs." };
export default function RootLayout({ children }: { children: React.ReactNode }) { return <html lang="fr"><body>{children}</body></html>; }
