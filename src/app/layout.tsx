import type { Metadata } from "next";
import { connection } from "next/server";
import "./globals.css";
import { shopSettings } from "@/server/shop/settings";

// El títol surt de la instància, no d'una constant compilada: cada botiga té
// el seu nom i el mateix artefacte serveix per a totes.
export async function generateMetadata(): Promise<Metadata> {
  const { shop_name } = await shopSettings();
  return {
    title: { default: shop_name, template: `%s · ${shop_name}` },
    description: "La nostra botiga de moda, properament.",
    robots: { index: false, follow: false },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // Cada resposta HTML necessita un nonce nou; no es comparteix a la CDN.
  await connection();
  return (
    <html lang="ca">
      <body>
        <a className="skip-link" href="#main">
          Salta al contingut
        </a>
        {children}
      </body>
    </html>
  );
}
