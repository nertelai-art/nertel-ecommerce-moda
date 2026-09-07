"use client";
import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  cartQuoteSchema,
  pendingOrderResultSchema,
  reservationResultSchema,
  type CartQuote,
  type PendingOrderResult,
} from "@/features/cart/cart-input";
import { useCart } from "./cart-provider";
import { useOnline } from "@/components/pwa/use-online";

function money(amount: number, currency: string) {
  return new Intl.NumberFormat("ca-ES", {
    style: "currency",
    currency,
  }).format(amount / 100);
}

export function CartPage({ currency }: { currency: string }) {
  const { items, setQuantity, remove, clear, hydrated, persistent } = useCart();
  const online = useOnline();
  const [quote, setQuote] = useState<CartQuote | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [reservedSignature, setReservedSignature] = useState("");
  const [order, setOrder] = useState<PendingOrderResult | null>(null);
  const request = useRef({ signature: "", key: "" });
  const checkoutRequest = useRef({ signature: "", key: "" });
  const signature = JSON.stringify(items);

  useEffect(() => {
    if (!hydrated || !online) return;
    const controller = new AbortController();
    fetch("/api/checkout/current", { signal: controller.signal })
      .then(async (response) => {
        if (response.status === 204) return null;
        if (!response.ok) throw new Error("Checkout unavailable");
        return pendingOrderResultSchema.parse(await response.json());
      })
      .then((result) => {
        if (result) setOrder(result);
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, [hydrated, online]);

  useEffect(() => {
    if (!hydrated || !online || !items.length) {
      return;
    }
    const controller = new AbortController();
    queueMicrotask(() => {
      if (controller.signal.aborted) return;
      setQuote(null);
      setLoading(true);
      setMessage("");
    });
    fetch("/api/cart/quote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
      signal: controller.signal,
    })
      .then(async (response) =>
        response.ok
          ? cartQuoteSchema.parse(await response.json())
          : Promise.reject(new Error("Quote rejected")),
      )
      .then(setQuote)
      .catch(() => {
        if (!controller.signal.aborted) {
          setQuote(null);
          setMessage("No hem pogut validar el carret.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [hydrated, online, signature, items]);

  async function reserve() {
    if (!navigator.onLine) return;
    if (request.current.signature !== signature) {
      request.current = { signature, key: crypto.randomUUID() };
    }
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/cart/reserve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items, requestKey: request.current.key }),
      });
      if (!response.ok) throw new Error("Reservation rejected");
      const result = reservationResultSchema.parse(await response.json());
      setReservedSignature(signature);
      setMessage(
        `Estoc reservat fins a ${new Intl.DateTimeFormat("ca-ES", { hour: "2-digit", minute: "2-digit" }).format(new Date(result.expiresAt))}. Completa les dades d’enviament.`,
      );
    } catch {
      setMessage("No s’ha pogut reservar tot l’estoc. Revisa les quantitats.");
    } finally {
      setLoading(false);
    }
  }

  async function prepareOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!navigator.onLine) return;
    const form = new FormData(event.currentTarget);
    const details = {
      email: String(form.get("email") ?? ""),
      recipient: String(form.get("recipient") ?? ""),
      line1: String(form.get("line1") ?? ""),
      line2: String(form.get("line2") ?? ""),
      city: String(form.get("city") ?? ""),
      region: String(form.get("region") ?? ""),
      postalCode: String(form.get("postalCode") ?? ""),
      countryCode: String(form.get("countryCode") ?? ""),
    };
    const checkoutSignature = JSON.stringify(details);
    if (checkoutRequest.current.signature !== checkoutSignature) {
      checkoutRequest.current = {
        signature: checkoutSignature,
        key: crypto.randomUUID(),
      };
    }
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/checkout/prepare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestKey: checkoutRequest.current.key,
          details,
        }),
      });
      if (!response.ok) throw new Error("Checkout rejected");
      const result = pendingOrderResultSchema.parse(await response.json());
      setOrder(result);
      setMessage("Comanda pendent creada. Encara no s’ha fet cap cobrament.");
    } catch {
      setMessage(
        "No s’ha pogut preparar la comanda. Comprova les dades i que la reserva continuï vigent.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function emptyCart() {
    if (!navigator.onLine) return;
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/cart/cancel", { method: "POST" });
      if (!response.ok) throw new Error("Cancellation rejected");
      setOrder(null);
      clear();
    } catch {
      setMessage("No s’ha pogut alliberar la reserva. Torna-ho a provar.");
    } finally {
      setLoading(false);
    }
  }

  if (!hydrated) return <p>Carregant el carret…</p>;
  if (order)
    return (
      <section className="grid gap-5 border border-line bg-white p-6">
        <p className="eyebrow">Comanda pendent</p>
        <h2 className="text-2xl font-semibold">
          {order.status === "expired"
            ? "La reserva ha caducat"
            : "Preparada per al pagament"}
        </h2>
        <p>
          {order.status === "expired"
            ? "No s’ha fet cap cobrament i l’estoc ha tornat a estar disponible."
            : `Import verificat: ${money(order.amountMinor, currency)}. Encara no s’ha fet cap cobrament perquè Stripe no està connectat.`}
        </p>
        <p className="text-sm text-muted">
          Referència: {order.orderId} · caduca a les{" "}
          {new Intl.DateTimeFormat("ca-ES", {
            hour: "2-digit",
            minute: "2-digit",
          }).format(new Date(order.expiresAt))}
        </p>
        <button
          className="action w-fit"
          type="button"
          disabled={loading || !online}
          onClick={emptyCart}
        >
          Cancel·lar comanda
        </button>
        <p role="status" aria-live="polite">
          {message}
        </p>
      </section>
    );
  if (!items.length)
    return (
      <div className="grid gap-5">
        <p>El carret és buit.</p>
        <Link className="action w-fit" href="/cataleg">
          Veure la col·lecció
        </Link>
      </div>
    );
  return (
    <div className="grid gap-6">
      {!persistent ? (
        <p role="status">
          El navegador no permet desar el carret. Es mantindrà mentre naveguis
          per la botiga, però es perdrà si recarregues o tanques aquesta pàgina.
        </p>
      ) : null}
      {!online ? (
        <p role="status">
          El carret es conserva al dispositiu. Cal connexió per actualitzar
          preus i disponibilitat; els imports mostrats poden haver canviat.
        </p>
      ) : null}
      {loading && !quote ? (
        <p role="status">Validant preus i disponibilitat…</p>
      ) : null}
      {quote?.items.map((item) => (
        <article
          key={item.variantId}
          className="grid gap-3 border border-line bg-white p-5 sm:grid-cols-[1fr_auto]"
        >
          <div>
            <h2 className="font-semibold">
              <Link href={`/productes/${item.slug}`}>{item.name}</Link>
            </h2>
            <p className="mt-1 text-sm text-muted">
              {item.size} · {item.color} ·{" "}
              {money(item.unitPriceMinor, currency)} cada unitat
            </p>
            {!item.available ? (
              <p className="mt-2 text-sm" role="alert">
                Quantitat no disponible.
              </p>
            ) : null}
          </div>
          <div className="flex items-end gap-3">
            <label className="grid gap-1 text-sm">
              Quantitat
              <input
                className="field w-24"
                type="number"
                min="1"
                max="99"
                value={item.quantity}
                onChange={(event) =>
                  setQuantity(item.variantId, Number(event.target.value))
                }
              />
            </label>
            <button
              type="button"
              className="action"
              onClick={() => remove(item.variantId)}
            >
              Eliminar
            </button>
          </div>
          <p className="font-medium sm:col-span-2">
            {money(item.lineTotalMinor, currency)}
          </p>
        </article>
      ))}
      {quote ? (
        <p className="text-xl font-semibold">
          Total: {money(quote.totalMinor, currency)}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-3">
        <button
          className="action"
          type="button"
          disabled={
            !online ||
            loading ||
            !quote ||
            quote.items.some((item) => !item.available)
          }
          onClick={reserve}
        >
          Reservar estoc
        </button>
        <button
          className="action"
          type="button"
          disabled={loading || !online}
          onClick={emptyCart}
        >
          Buidar carret
        </button>
      </div>
      <p role="status" aria-live="polite">
        {message}
      </p>
      {reservedSignature === signature ? (
        <form
          className="grid gap-4 border border-line bg-white p-6 sm:grid-cols-2"
          onSubmit={prepareOrder}
        >
          <h2 className="text-xl font-semibold sm:col-span-2">
            Dades d’enviament
          </h2>
          <label className="grid gap-1 text-sm">
            Correu electrònic
            <input
              className="field"
              name="email"
              type="email"
              required
              maxLength={320}
              autoComplete="email"
            />
          </label>
          <label className="grid gap-1 text-sm">
            Destinatari
            <input
              className="field"
              name="recipient"
              required
              maxLength={120}
              autoComplete="name"
            />
          </label>
          <label className="grid gap-1 text-sm sm:col-span-2">
            Adreça
            <input
              className="field"
              name="line1"
              required
              maxLength={200}
              autoComplete="address-line1"
            />
          </label>
          <label className="grid gap-1 text-sm sm:col-span-2">
            Complement d’adreça
            <input
              className="field"
              name="line2"
              maxLength={200}
              autoComplete="address-line2"
            />
          </label>
          <label className="grid gap-1 text-sm">
            Ciutat
            <input
              className="field"
              name="city"
              required
              maxLength={120}
              autoComplete="address-level2"
            />
          </label>
          <label className="grid gap-1 text-sm">
            Província o regió
            <input
              className="field"
              name="region"
              maxLength={120}
              autoComplete="address-level1"
            />
          </label>
          <label className="grid gap-1 text-sm">
            Codi postal
            <input
              className="field"
              name="postalCode"
              required
              maxLength={32}
              autoComplete="postal-code"
            />
          </label>
          <label className="grid gap-1 text-sm">
            País (ISO)
            <input
              className="field"
              name="countryCode"
              defaultValue="ES"
              required
              pattern="[A-Za-z]{2}"
              maxLength={2}
              autoComplete="country"
            />
          </label>
          <button
            className="action w-fit sm:col-span-2"
            type="submit"
            disabled={loading || !online}
          >
            Crear comanda pendent
          </button>
        </form>
      ) : null}
    </div>
  );
}
