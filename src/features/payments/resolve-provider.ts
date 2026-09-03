import type { PaymentProvider, PaymentReference } from "./payment-provider";

/** Sempre resoldre operacions històriques amb la referència desada al servidor. */
export function resolvePaymentProvider(
  providers: readonly PaymentProvider[],
  reference: Pick<PaymentReference, "provider" | "accountKey" | "environment">,
): PaymentProvider {
  const matches = providers.filter(
    ({ identity }) =>
      identity.provider === reference.provider &&
      identity.accountKey === reference.accountKey &&
      identity.environment === reference.environment,
  );
  if (matches.length !== 1) {
    throw new Error("Payment provider configuration is missing or ambiguous");
  }
  return matches[0]!;
}
