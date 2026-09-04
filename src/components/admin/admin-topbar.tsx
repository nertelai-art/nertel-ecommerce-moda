"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const sections = {
  "/admin": {
    eyebrow: "Vista general",
    title: "Bon dia.",
    description: "Estat actual de la botiga i accessos ràpids de gestió.",
  },
  "/admin/productes": {
    eyebrow: "Catàleg",
    title: "Productes",
    description: "Peces, preus, variants, categories i fotografies.",
  },
  "/admin/inventari": {
    eyebrow: "Operacions",
    title: "Inventari",
    description: "Talles, colors, disponibilitat i ajustos d’estoc.",
  },
  "/admin/comandes": {
    eyebrow: "Operacions",
    title: "Comandes",
    description: "Clients, peces, imports, pagaments i adreces d’entrega.",
  },
} as const;

export function AdminTopbar() {
  const pathname = usePathname();
  const section =
    sections[pathname as keyof typeof sections] ?? sections["/admin"];

  return (
    <header className="border-b border-[#d8d8d0] bg-white px-5 py-3 sm:px-8">
      <div className="flex min-h-14 items-center justify-between gap-5">
        <div className="flex min-w-0 items-baseline gap-x-4 gap-y-1 max-lg:flex-wrap">
          <p className="shrink-0 text-[0.62rem] tracking-[0.16em] text-muted uppercase">
            {section.eyebrow}
          </p>
          <h1 className="shrink-0 font-serif text-2xl sm:text-3xl">
            {section.title}
          </h1>
          <p className="truncate text-sm text-muted max-md:hidden">
            {section.description}
          </p>
        </div>
        <Link
          className="shrink-0 text-sm underline underline-offset-4"
          href="/compte"
        >
          El meu compte
        </Link>
      </div>
    </header>
  );
}
