"use client";
import Image from "next/image";
import { useActionState } from "react";
import type { StorefrontContent } from "@/features/content/storefront";
import { saveStorefrontDraft } from "@/server/content/actions";
const initial = { ok: false, message: "" };
export function StorefrontEditor({ content }: { content: StorefrontContent }) {
  const [state, action, pending] = useActionState(saveStorefrontDraft, initial);
  return (
    <form action={action} className="grid gap-5 xl:grid-cols-[1.1fr_.9fr]">
      <div className="grid gap-4">
        <Panel title="Portada principal">
          <Field
            label="Etiqueta"
            name="heroEyebrow"
            value={content.hero.eyebrow}
          />
          <Field label="Títol" name="heroTitle" value={content.hero.title} />
          <Area
            label="Descripció"
            name="heroDescription"
            value={content.hero.description}
            max={300}
          />
          <label className="grid gap-1 text-xs uppercase">
            Imatge
            <select
              className="field normal-case"
              defaultValue={content.hero.image}
              name="heroImage"
            >
              <option value="/editorial/campaign-hero.png">
                Campanya · parella
              </option>
              <option value="/editorial/campaign-woman.png">
                Campanya · dona
              </option>
              <option value="/editorial/campaign-man.png">
                Campanya · home
              </option>
            </select>
          </label>
          <Field
            label="Text alternatiu de la imatge"
            name="heroImageAlt"
            value={content.hero.imageAlt}
            max={240}
          />
        </Panel>
        <Panel title="Editorial">
          <Field
            label="Etiqueta"
            name="editorialEyebrow"
            value={content.editorial.eyebrow}
          />
          <Field
            label="Títol"
            name="editorialTitle"
            value={content.editorial.title}
            max={140}
          />
        </Panel>
        <Panel title="Manifest">
          <Field
            label="Etiqueta"
            name="manifestEyebrow"
            value={content.manifest.eyebrow}
          />
          <Field
            label="Declaració"
            name="manifestTitle"
            value={content.manifest.title}
            max={180}
          />
        </Panel>
        <Panel title="Tancament">
          <Field
            label="Etiqueta"
            name="closingEyebrow"
            value={content.closing.eyebrow}
          />
          <Field
            label="Títol"
            name="closingTitle"
            value={content.closing.title}
            max={180}
          />
          <Area
            label="Descripció"
            name="closingDescription"
            value={content.closing.description}
            max={320}
          />
        </Panel>
        <div className="sticky bottom-4 flex items-center gap-4 rounded-xl border border-line bg-white/95 p-3 shadow-lg backdrop-blur">
          <button className="action" disabled={pending}>
            {pending ? "Desant…" : "Desar esborrany"}
          </button>
          <p
            className={
              state.ok ? "text-sm text-[#315545]" : "text-sm text-[#914724]"
            }
            role="status"
          >
            {state.message}
          </p>
        </div>
      </div>
      <aside className="xl:sticky xl:top-24 xl:self-start">
        <p className="mb-2 text-xs tracking-wide text-muted uppercase">
          Previsualització de portada
        </p>
        <div className="relative aspect-[4/5] overflow-hidden rounded-xl bg-sand">
          <Image
            alt=""
            className="object-cover"
            fill
            priority
            sizes="(min-width:1280px) 36vw, 90vw"
            src={content.hero.image}
          />
          <div className="absolute inset-0 bg-black/35" />
          <div className="absolute inset-x-0 bottom-0 p-7 text-white">
            <p className="text-xs uppercase">{content.hero.eyebrow}</p>
            <p className="mt-3 font-serif text-5xl leading-none">
              {content.hero.title}
            </p>
            <p className="mt-4 text-sm">{content.hero.description}</p>
          </div>
        </div>
      </aside>
    </form>
  );
}
function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="grid gap-3 rounded-xl border border-line bg-white p-5">
      <h2 className="font-serif text-2xl">{title}</h2>
      {children}
    </section>
  );
}
function Field({
  label,
  name,
  value,
  max = 100,
}: {
  label: string;
  name: string;
  value: string;
  max?: number;
}) {
  return (
    <label className="grid gap-1 text-xs uppercase">
      {label}
      <input
        className="field normal-case"
        defaultValue={value}
        maxLength={max}
        name={name}
        required
      />
    </label>
  );
}
function Area({
  label,
  name,
  value,
  max,
}: {
  label: string;
  name: string;
  value: string;
  max: number;
}) {
  return (
    <label className="grid gap-1 text-xs uppercase">
      {label}
      <textarea
        className="field min-h-24 normal-case"
        defaultValue={value}
        maxLength={max}
        name={name}
        required
      />
    </label>
  );
}
