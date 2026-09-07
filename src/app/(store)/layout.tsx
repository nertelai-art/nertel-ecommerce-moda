import Link from "next/link";
import Image from "next/image";
import { shopSettings } from "@/server/shop/settings";
import { CartProvider } from "@/components/cart/cart-provider";
import { CartNavLink } from "@/components/cart/cart-nav-link";
import { InstallApp } from "@/components/pwa/install-app";

export default async function StoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const shop = await shopSettings();
  return (
    <CartProvider>
      <div className="flex min-h-dvh flex-col">
        <header className="border-b border-line">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-6 py-3 sm:px-12 sm:py-4">
            <Link
              className="inline-flex items-center gap-3 font-serif text-xl sm:text-2xl"
              href="/"
            >
              <Image
                src="/pwa/icon.svg"
                width={40}
                height={40}
                alt=""
                aria-hidden="true"
              />
              {shop.shop_name}
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
            <span>{shop.shop_name}</span>
            <span>Estem preparant les primeres col·leccions.</span>
          </div>
          <InstallApp />
        </footer>
      </div>
    </CartProvider>
  );
}
