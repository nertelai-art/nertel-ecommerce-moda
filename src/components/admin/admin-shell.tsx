import Link from "next/link";
import { shopSettings } from "@/server/shop/settings";
import { AdminTopbar } from "@/components/admin/admin-topbar";

const navigation = [
  { href: "/admin", label: "Resum" },
  { href: "/admin/productes", label: "Productes" },
  { href: "/admin/inventari", label: "Inventari" },
  { href: "/admin/comandes", label: "Comandes" },
  { href: "/admin/clients", label: "Clients" },
  { href: "/admin/proveidors", label: "Proveïdors" },
  { href: "/admin/enviaments", label: "Enviaments" },
  { href: "/admin/economia", label: "Economia" },
  { href: "/admin/contingut", label: "Contingut" },
] as const;

const upcoming: string[] = [];

export async function AdminShell({ children }: { children: React.ReactNode }) {
  const shop = await shopSettings();
  return (
    <div className="min-h-dvh bg-[#f2f1ed] text-[#1f2420] lg:grid lg:grid-cols-[15rem_1fr]">
      <aside className="border-b border-[#d8d8d0] bg-[#20392e] text-white lg:sticky lg:top-0 lg:h-dvh lg:border-r lg:border-b-0 lg:border-white/10">
        <div className="flex items-center justify-between px-5 py-4 lg:block lg:px-6 lg:py-7">
          <Link className="font-serif text-xl" href="/admin">
            {shop.shop_name}
          </Link>
          <span className="rounded-full bg-white/10 px-2.5 py-1 text-[0.65rem] tracking-[0.16em] uppercase">
            Admin
          </span>
        </div>
        <nav
          aria-label="Navegació d’administració"
          className="flex gap-1 overflow-x-auto px-3 pb-4 lg:grid lg:px-4"
        >
          {navigation.map((item) => (
            <Link
              className="shrink-0 rounded px-3 py-2.5 text-sm hover:bg-white/10 focus-visible:bg-white/10"
              href={item.href}
              key={item.href}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        {upcoming.length ? (
          <div className="hidden border-t border-white/10 px-4 pt-5 lg:block">
            <p className="px-3 text-[0.65rem] tracking-[0.18em] text-white/50 uppercase">
              Pròximament
            </p>
            <ul className="mt-2 grid gap-1">
              {upcoming.map((label) => (
                <li className="px-3 py-2 text-sm text-white/45" key={label}>
                  {label}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        <div className="hidden px-7 py-6 lg:absolute lg:bottom-0 lg:block">
          <Link className="text-xs text-white/70 underline" href="/">
            Tornar a la botiga
          </Link>
        </div>
      </aside>
      <div className="min-w-0">
        <AdminTopbar />
        {children}
      </div>
    </div>
  );
}
