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
/**
 * Text de reserva quan la lectura del contingut publicat falla. És el mateix
 * text neutre que deixa la migració 20260906090000: cap instància pot arrencar
 * ni caure mai amb la campanya d'una altra botiga. La campanya d'una botiga
 * concreta viu a la base de dades i s'edita des del panell de contingut.
 */
export const defaultStorefrontContent: StorefrontContent = {
  hero: {
    eyebrow: "Nova temporada",
    title: "El titular de la portada",
    description:
      "Aquest text el defineix la botiga des del panell de contingut.",
    image: "/editorial/campaign-hero.png",
    imageAlt: "Descripcio de la imatge de portada",
  },
  editorial: {
    eyebrow: "Seccio editorial",
    title: "El titular de la seccio editorial.",
  },
  manifest: {
    eyebrow: "Manifest",
    title: "El titular del manifest.",
  },
  closing: {
    eyebrow: "Tancament",
    title: "El titular de tancament.",
    description:
      "Aquest text el defineix la botiga des del panell de contingut.",
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
