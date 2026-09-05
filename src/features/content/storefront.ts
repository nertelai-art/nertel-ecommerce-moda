import { z } from "zod";

export const storefrontContentSchema = z.object({
  hero: z.object({
    eyebrow: z.string().trim().min(1).max(80),
    title: z.string().trim().min(1).max(100),
    description: z.string().trim().min(1).max(300),
    image: z.enum([
      "/editorial/campaign-hero.png",
      "/editorial/campaign-woman.png",
      "/editorial/campaign-man.png",
    ]),
    imageAlt: z.string().trim().min(1).max(240),
  }),
  editorial: z.object({
    eyebrow: z.string().trim().min(1).max(80),
    title: z.string().trim().min(1).max(140),
  }),
  manifest: z.object({
    eyebrow: z.string().trim().min(1).max(80),
    title: z.string().trim().min(1).max(180),
  }),
  closing: z.object({
    eyebrow: z.string().trim().min(1).max(80),
    title: z.string().trim().min(1).max(180),
    description: z.string().trim().min(1).max(320),
  }),
});
export type StorefrontContent = z.infer<typeof storefrontContentSchema>;
export const defaultStorefrontContent: StorefrontContent = {
  hero: {
    eyebrow: "Primavera · Estiu 2026",
    title: "Menys soroll. Més tu.",
    description:
      "Una col·lecció serena de peces versàtils, textures naturals i formes que respiren.",
    image: "/editorial/campaign-hero.png",
    imageAlt: "Dues persones amb peces de lli en una arquitectura mediterrània",
  },
  editorial: {
    eyebrow: "Històries d’estil",
    title: "Una manera més tranquil·la de vestir.",
  },
  manifest: {
    eyebrow: "Manifest 01",
    title: "Comprar menys. Triar millor. Portar-ho molt.",
  },
  closing: {
    eyebrow: "La primera edició",
    title: "Peces per tornar-hi, una vegada i una altra.",
    description:
      "Previsualització de la botiga. Pots explorar el catàleg i preparar el carret; els pagaments encara no estan activats.",
  },
};
export const contentActionStateSchema = z.object({
  ok: z.boolean(),
  message: z.string(),
});
export type ContentActionState = z.infer<typeof contentActionStateSchema>;
export function contentFromForm(form: FormData) {
  return storefrontContentSchema.safeParse({
    hero: {
      eyebrow: form.get("heroEyebrow"),
      title: form.get("heroTitle"),
      description: form.get("heroDescription"),
      image: form.get("heroImage"),
      imageAlt: form.get("heroImageAlt"),
    },
    editorial: {
      eyebrow: form.get("editorialEyebrow"),
      title: form.get("editorialTitle"),
    },
    manifest: {
      eyebrow: form.get("manifestEyebrow"),
      title: form.get("manifestTitle"),
    },
    closing: {
      eyebrow: form.get("closingEyebrow"),
      title: form.get("closingTitle"),
      description: form.get("closingDescription"),
    },
  });
}
