import type { Metadata } from "next";
import { connection } from "next/server";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Botiga de moda", template: "%s · Botiga de moda" },
  description: "La nostra botiga de moda, properament.",
  robots: { index: false, follow: false },
};

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
