import { StorefrontEditor } from "@/components/admin/storefront-editor";
import { publishStorefrontContent } from "@/server/content/actions";
import { staffStorefrontContent } from "@/server/content/repository";
import { staffAccess } from "@/server/permissions/staff";
export const metadata = { title: "Contingut · Administració" };
export default async function Page() {
  const access = await staffAccess();
  if (
    access.status !== "allowed" ||
    !access.permissions.includes("content.manage")
  )
    return (
      <main className="p-8">
        <h2 className="font-serif text-3xl">Accés restringit</h2>
      </main>
    );
  const data = await staffStorefrontContent();
  const pending = JSON.stringify(data.draft) !== JSON.stringify(data.published);
  return (
    <main
      id="main"
      className="mx-auto max-w-[100rem] px-5 py-5 sm:px-8 sm:py-6"
    >
      <section className="mb-5 flex flex-wrap items-center justify-between gap-4 border-b border-line pb-4">
        <div className="flex gap-7">
          <Metric
            label="Estat"
            value={pending ? "Canvis pendents" : "Publicat"}
          />
          <Metric
            label="Última publicació"
            value={new Intl.DateTimeFormat("ca-ES", {
              dateStyle: "medium",
              timeStyle: "short",
            }).format(new Date(data.published_at))}
          />
        </div>
        <form action={publishStorefrontContent}>
          <button className="action" disabled={!pending}>
            Publicar a la botiga
          </button>
        </form>
      </section>
      <StorefrontEditor content={data.draft} />
    </main>
  );
}
function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <strong className="font-serif text-xl">{value}</strong>
      <span className="text-[.65rem] text-muted uppercase">{label}</span>
    </div>
  );
}
