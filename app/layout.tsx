import type { Metadata, Viewport } from "next";
import { Atkinson_Hyperlegible } from "next/font/google";
import type { ReactNode } from "react";
import "./globals.css";

// Drawn to stay readable at small sizes on a phone; Arabic excerpts fall back to the phone's own font.
const font = Atkinson_Hyperlegible({ subsets: ["latin"], weight: ["400", "700"], display: "swap" });

export const metadata: Metadata = {
  title: "Logement étudiant, Grand Tunis",
  description:
    "Les annonces de location et de colocation du Grand Tunis, dans les quartiers proches de votre faculté, école ou institut.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr">
      <body className={font.className}>
        <header className="site-head">
          <div className="column">
            <a href="/">Logement étudiant, Grand Tunis</a>
          </div>
        </header>
        {children}
        <footer className="site-foot">
          <div className="column">
            <p>Les annonces viennent de groupes Facebook publics. Le contact se fait toujours sur l'annonce d'origine.</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
