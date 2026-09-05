import Image from "next/image";
import { ProductPlaceholder } from "./product-placeholder";

export type PublicProductImage = { id: string; altText: string };

export function ProductImage({
  image,
  fallbackSrc,
  sizes,
  priority = false,
}: {
  image: PublicProductImage | undefined;
  fallbackSrc?: string | undefined;
  sizes: string;
  priority?: boolean;
}) {
  const src = image ? `/media/products/${image.id}` : fallbackSrc;
  if (!src) return <ProductPlaceholder />;
  return (
    <div className="relative aspect-[3/4] overflow-hidden bg-sand">
      <Image
        src={src}
        alt={image?.altText ?? "Imatge editorial de demostració de la peça"}
        fill
        sizes={sizes}
        priority={priority}
        className="object-cover"
      />
    </div>
  );
}
