import type { Metadata, Viewport } from "next";
import { connection } from "next/server";
import "./globals.css";
import { shopSettings } from "@/server/shop/settings";
import { PwaStatus } from "@/components/pwa/pwa-status";

export const viewport: Viewport = { themeColor: "#354d40" };

// El títol surt de la instància, no d'una constant compilada: cada botiga té
// el seu nom i el mateix artefacte serveix per a totes.
export async function generateMetadata(): Promise<Metadata> {
  const { shop_name } = await shopSettings();
  return {
    title: { default: shop_name, template: `%s · ${shop_name}` },
    description: "La nostra botiga de moda, properament.",
    robots: { index: false, follow: false },
    appleWebApp: { capable: true, title: shop_name, statusBarStyle: "default" },
    icons: { apple: "/pwa/apple-touch-icon.png" },
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
        <PwaStatus />
        {children}
      </body>
    </html>
  );
}
