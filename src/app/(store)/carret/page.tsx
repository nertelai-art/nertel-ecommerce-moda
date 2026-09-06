import { CartPage } from "@/components/cart/cart-page";
import { shopSettings } from "@/server/shop/settings";

export const metadata = { title: "Carret" };

export default async function Page() {
  const { currency } = await shopSettings();
  return (
    <main id="main" className="mx-auto w-full max-w-3xl px-6 py-12">
      <h1 className="mb-8 font-serif text-4xl">El teu carret</h1>
      <CartPage currency={currency} />
    </main>
  );
}
