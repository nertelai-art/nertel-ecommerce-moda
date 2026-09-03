import type { Money } from "../../lib/money";

/** Identifica una configuració concreta: proveïdor, compte i entorn. */
export interface PaymentReference {
  readonly provider: string;
  readonly accountKey: string;
  readonly environment: "test" | "live";
  readonly checkoutId: string;
}

export type PaymentStatus = "pending" | "paid" | "failed" | "expired";

/** Només dades autoritatives del servidor, després de reservar estoc. */
export interface CheckoutRequest {
  readonly attemptId: string;
  readonly idempotencyKey: string;
  readonly total: Money;
  readonly lines: readonly {
    readonly name: string;
    readonly quantity: number;
    readonly unitPrice: Money;
  }[];
  readonly expiresAt: Date;
}

export interface CheckoutSnapshot {
  readonly reference: PaymentReference;
  readonly attemptId: string;
  readonly status: PaymentStatus;
  readonly total: Money;
}

/** Cap SDK, secret ni estat específic del proveïdor travessa aquest contracte. */
export interface PaymentProvider {
  readonly identity: Pick<
    PaymentReference,
    "provider" | "accountKey" | "environment"
  >;
  /** URL de retorn configurada a l'adaptador, mai acceptada del navegador. */
  createCheckout(request: CheckoutRequest): Promise<{
    readonly reference: PaymentReference;
    readonly redirectUrl: string;
    readonly expiresAt: Date;
  }>;
  getCheckout(reference: PaymentReference): Promise<CheckoutSnapshot>;
  /** No alliberar estoc fins a reconciliar el resultat amb la comanda. */
  expireCheckout(reference: PaymentReference): Promise<CheckoutSnapshot>;
  /** Verifica signatura sobre bytes originals abans de normalitzar. */
  verifyWebhook(
    rawBody: Uint8Array,
    headers: Readonly<Record<string, string>>,
  ): Promise<{
    readonly eventId: string;
    readonly environment: "test" | "live";
    readonly checkout: CheckoutSnapshot | null;
  }>;
  /** Límits de devolució i permisos validats i persistits pel servei. */
  refund(request: {
    readonly reference: PaymentReference;
    readonly refundId: string;
    readonly idempotencyKey: string;
    readonly amount: Money;
  }): Promise<{
    readonly providerRefundId: string;
    readonly status: "pending" | "succeeded" | "failed";
  }>;
}
