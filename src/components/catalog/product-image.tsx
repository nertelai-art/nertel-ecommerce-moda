import Image from "next/image";
import { ProductPlaceholder } from "./product-placeholder";

export type PublicProductImage = { id: string; altText: string };

export function ProductImage({
  image,
  sizes,
  priority = false,
}: {
  image: PublicProductImage | undefined;
  sizes: string;
  priority?: boolean;
}) {
  if (!image) return <ProductPlaceholder />;
  return (
    <div className="relative aspect-[3/4] overflow-hidden bg-sand">
      <Image
        src={`/media/products/${image.id}`}
        alt={image.altText}
        fill
        sizes={sizes}
        priority={priority}
        className="object-cover"
      />
    </div>
  );
}
