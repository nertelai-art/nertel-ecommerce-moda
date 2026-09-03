export interface Money {
  readonly amountMinor: number;
  readonly currency: string;
}

export function money(amountMinor: number, currency: string): Money {
  if (!Number.isSafeInteger(amountMinor) || amountMinor < 0) {
    throw new RangeError("Amount must be a non-negative safe integer");
  }
  if (!/^[A-Z]{3}$/.test(currency)) {
    throw new TypeError("Currency must have three uppercase letters");
  }
  return Object.freeze({ amountMinor, currency });
}

export function lineTotal(unitPrice: Money, quantity: number): Money {
  if (!Number.isSafeInteger(quantity) || quantity < 1) {
    throw new RangeError("Quantity must be a positive safe integer");
  }
  return money(unitPrice.amountMinor * quantity, unitPrice.currency);
}
