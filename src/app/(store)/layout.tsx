import Link from "next/link";
import { brand } from "@/lib/brand";

export default function StoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col">
      <p className="bg-accent px-4 py-3 text-center text-xs tracking-wide text-white">
        {brand.previewNotice}
      </p>
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-6 sm:px-12">
          <Link className="font-serif text-2xl sm:text-3xl" href="/">
            {brand.name}
          </Link>
          <nav aria-label="Navegació principal" className="flex gap-6 text-sm">
            <Link
              className="inline-flex min-h-11 items-center hover:underline"
              href="/"
            >
              Inici
            </Link>
            <Link
              className="inline-flex min-h-11 items-center hover:underline"
              href="/cataleg"
            >
              Col·lecció
            </Link>
            <Link
              className="inline-flex min-h-11 items-center hover:underline"
              href="/compte"
            >
              Compte
            </Link>
          </nav>
        </div>
      </header>
      {children}
      <footer className="mt-auto border-t border-line px-6 py-8 text-sm text-muted">
        <div className="mx-auto flex max-w-7xl flex-wrap justify-between gap-3">
          <span>{brand.name}</span>
          <span>Estem preparant les primeres col·leccions.</span>
        </div>
      </footer>
    </div>
  );
}
