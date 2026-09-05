"use client";
import Link from "next/link";
import { useCart } from "./cart-provider";
export function CartNavLink() {
  const { count, hydrated } = useCart();
  return (
    <Link
      className="inline-flex min-h-11 items-center hover:underline"
      href="/carret"
    >
      Carret{hydrated && count ? ` (${count})` : ""}
    </Link>
  );
}
