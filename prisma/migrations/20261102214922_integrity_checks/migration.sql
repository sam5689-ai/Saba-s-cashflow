
-- ───────────── Data-integrity rules (not expressible in schema.prisma) ─────────────

ALTER TABLE "Property"
  ADD CONSTRAINT "Property_ownershipShare_range" CHECK ("ownershipShare" > 0 AND "ownershipShare" <= 1),
  ADD CONSTRAINT "Property_rentDayOfMonth_range" CHECK ("rentDayOfMonth" BETWEEN 1 AND 28),
  ADD CONSTRAINT "Property_expectedRent_nonneg" CHECK ("expectedMonthlyRentIls" IS NULL OR "expectedMonthlyRentIls" >= 0);

ALTER TABLE "Pension"
  ADD CONSTRAINT "Pension_paymentDayOfMonth_range" CHECK ("paymentDayOfMonth" BETWEEN 1 AND 28),
  ADD CONSTRAINT "Pension_expectedGbp_nonneg" CHECK ("expectedMonthlyGbp" IS NULL OR "expectedMonthlyGbp" >= 0),
  ADD CONSTRAINT "Pension_defaultRate_positive" CHECK ("defaultExchangeRate" IS NULL OR "defaultExchangeRate" > 0);

ALTER TABLE "RecurringTemplate"
  ADD CONSTRAINT "RecurringTemplate_dayOfMonth_range" CHECK ("dayOfMonth" BETWEEN 1 AND 28),
  ADD CONSTRAINT "RecurringTemplate_amount_nonneg" CHECK ("amountIls" >= 0),
  ADD CONSTRAINT "RecurringTemplate_dates_order" CHECK ("endDate" IS NULL OR "endDate" >= "startDate");

-- Each inflow type must carry the inputs its net amount is derived from.
ALTER TABLE "Inflow"
  ADD CONSTRAINT "Inflow_rent_fields" CHECK (
    "type" <> 'RENT' OR ("propertyId" IS NOT NULL AND "grossAmountIls" IS NOT NULL AND "ownershipShare" > 0 AND "ownershipShare" <= 1)
  ),
  ADD CONSTRAINT "Inflow_pension_fields" CHECK (
    "type" <> 'PENSION' OR ("pensionId" IS NOT NULL AND "amountGbp" IS NOT NULL AND "exchangeRate" > 0)
  ),
  ADD CONSTRAINT "Inflow_net_nonneg" CHECK ("netAmountIls" >= 0);

ALTER TABLE "Outflow"
  ADD CONSTRAINT "Outflow_amount_nonneg" CHECK ("amountIls" >= 0);
