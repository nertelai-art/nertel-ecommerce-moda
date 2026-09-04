import Link from "next/link";
import { brand } from "@/lib/brand";
import { CartProvider } from "@/components/cart/cart-provider";
import { CartNavLink } from "@/components/cart/cart-nav-link";

export default function StoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <CartProvider>
      <div className="flex min-h-dvh flex-col">
        <header className="border-b border-line">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-6 py-3 sm:px-12 sm:py-4">
            <Link className="font-serif text-xl sm:text-2xl" href="/">
              {brand.name}
            </Link>
            <nav
              aria-label="Navegació principal"
              className="flex gap-5 text-xs sm:text-sm"
            >
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
              <CartNavLink />
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
    </CartProvider>
  );
}
