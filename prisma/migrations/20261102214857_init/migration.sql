-- CreateEnum
CREATE TYPE "InflowType" AS ENUM ('RENT', 'PENSION', 'OTHER');

-- CreateEnum
CREATE TYPE "CategoryTier" AS ENUM ('FIXED_BASELINE', 'VARIABLE_LIFESTYLE');

-- CreateEnum
CREATE TYPE "EntrySource" AS ENUM ('RECURRING_RULE', 'MANUAL', 'STATEMENT_IMPORT');

-- CreateTable
CREATE TABLE "Property" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "ownershipShare" DECIMAL(5,4) NOT NULL DEFAULT 1,
    "expectedMonthlyRentIls" DECIMAL(12,2),
    "rentDayOfMonth" INTEGER NOT NULL DEFAULT 1,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Property_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pension" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "provider" TEXT,
    "expectedMonthlyGbp" DECIMAL(12,2),
    "defaultExchangeRate" DECIMAL(10,6),
    "paymentDayOfMonth" INTEGER NOT NULL DEFAULT 1,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pension_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tier" "CategoryTier" NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecurringTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "amountIls" DECIMAL(12,2) NOT NULL,
    "dayOfMonth" INTEGER NOT NULL DEFAULT 1,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "startDate" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecurringTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Inflow" (
    "id" TEXT NOT NULL,
    "type" "InflowType" NOT NULL,
    "date" DATE NOT NULL,
    "source" "EntrySource" NOT NULL DEFAULT 'MANUAL',
    "propertyId" TEXT,
    "grossAmountIls" DECIMAL(12,2),
    "ownershipShare" DECIMAL(5,4),
    "pensionId" TEXT,
    "amountGbp" DECIMAL(12,2),
    "exchangeRate" DECIMAL(10,6),
    "netAmountIls" DECIMAL(12,2) NOT NULL,
    "notes" TEXT,
    "postingKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Inflow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Outflow" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "amountIls" DECIMAL(12,2) NOT NULL,
    "date" DATE NOT NULL,
    "description" TEXT,
    "source" "EntrySource" NOT NULL DEFAULT 'MANUAL',
    "recurringTemplateId" TEXT,
    "postingKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Outflow_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Property_name_key" ON "Property"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Pension_name_key" ON "Pension"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Category_name_key" ON "Category"("name");

-- CreateIndex
CREATE INDEX "Category_tier_sortOrder_idx" ON "Category"("tier", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "RecurringTemplate_name_key" ON "RecurringTemplate"("name");

-- CreateIndex
CREATE INDEX "RecurringTemplate_active_idx" ON "RecurringTemplate"("active");

-- CreateIndex
CREATE UNIQUE INDEX "Inflow_postingKey_key" ON "Inflow"("postingKey");

-- CreateIndex
CREATE INDEX "Inflow_date_idx" ON "Inflow"("date");

-- CreateIndex
CREATE INDEX "Inflow_type_date_idx" ON "Inflow"("type", "date");

-- CreateIndex
CREATE UNIQUE INDEX "Outflow_postingKey_key" ON "Outflow"("postingKey");

-- CreateIndex
CREATE INDEX "Outflow_date_idx" ON "Outflow"("date");

-- CreateIndex
CREATE INDEX "Outflow_categoryId_date_idx" ON "Outflow"("categoryId", "date");

-- AddForeignKey
ALTER TABLE "RecurringTemplate" ADD CONSTRAINT "RecurringTemplate_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inflow" ADD CONSTRAINT "Inflow_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inflow" ADD CONSTRAINT "Inflow_pensionId_fkey" FOREIGN KEY ("pensionId") REFERENCES "Pension"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Outflow" ADD CONSTRAINT "Outflow_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Outflow" ADD CONSTRAINT "Outflow_recurringTemplateId_fkey" FOREIGN KEY ("recurringTemplateId") REFERENCES "RecurringTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
