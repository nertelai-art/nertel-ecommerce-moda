"use client";
import { useState } from "react";
import { useCart } from "./cart-provider";
export function AddToCartButton({
  variantId,
  label,
}: {
  variantId: string;
  label: string;
}) {
  const { add } = useCart();
  const [added, setAdded] = useState(false);
  return (
    <button
      className="action"
      type="button"
      onClick={() => {
        add(variantId);
        setAdded(true);
      }}
      aria-label={`Afegir ${label} al carret`}
    >
      {added ? "Afegit" : "Afegir al carret"}
    </button>
  );
}
