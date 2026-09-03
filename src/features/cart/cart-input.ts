import { z } from "zod";

// Límit tècnic provisional; el servidor també comprovarà el límit comercial i l'estoc.
export const cartItemInputSchema = z.strictObject({
  variantId: z.uuid(),
  quantity: z.number().int().min(1).max(99),
});

export const cartInputSchema = z
  .strictObject({
    items: z.array(cartItemInputSchema).min(1).max(100),
  })
  .superRefine(({ items }, context) => {
    const variants = new Set<string>();
    for (const item of items) {
      if (variants.has(item.variantId)) {
        context.addIssue({ code: "custom", message: "Duplicate variant" });
      }
      variants.add(item.variantId);
    }
  });

export type CartInput = z.infer<typeof cartInputSchema>;
