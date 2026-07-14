-- AlterTable: add maintenance and custom cost fields
ALTER TABLE "Listing" ADD COLUMN "annualMaintenance" INTEGER;
ALTER TABLE "Listing" ADD COLUMN "additionalCosts" JSONB;
