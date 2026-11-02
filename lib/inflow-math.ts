import { Prisma } from "@prisma/client";

/**
 * The single place where inflow amounts are calculated. Every Inflow row
 * should be built with one of these helpers so `netAmountIls` always agrees
 * with its inputs.
 */

type DecimalInput = Prisma.Decimal | number | string;

const D = (v: DecimalInput) => new Prisma.Decimal(v);
const toMoney = (v: Prisma.Decimal) => v.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);

/** Rent: family's share of the full rent. */
export function rentAmounts(grossAmountIls: DecimalInput, ownershipShare: DecimalInput) {
  const gross = D(grossAmountIls);
  const share = D(ownershipShare);
  if (gross.isNegative()) throw new RangeError("Rent cannot be negative");
  if (share.lte(0) || share.gt(1)) throw new RangeError("Ownership share must be > 0 and ≤ 1");
  return {
    grossAmountIls: toMoney(gross),
    ownershipShare: share,
    netAmountIls: toMoney(gross.mul(share)),
  };
}

/** UK pension: GBP converted to ILS. `exchangeRate` is ILS per £1. */
export function pensionAmounts(amountGbp: DecimalInput, exchangeRate: DecimalInput) {
  const gbp = D(amountGbp);
  const rate = D(exchangeRate);
  if (gbp.isNegative()) throw new RangeError("Pension amount cannot be negative");
  if (rate.lte(0)) throw new RangeError("Exchange rate must be positive");
  return {
    amountGbp: toMoney(gbp),
    exchangeRate: rate,
    netAmountIls: toMoney(gbp.mul(rate)),
  };
}
