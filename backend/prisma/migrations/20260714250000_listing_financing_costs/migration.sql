-- AlterTable: add financing and annual cost fields to Listing
ALTER TABLE "Listing" ADD COLUMN "downPaymentPct" DOUBLE PRECISION;
ALTER TABLE "Listing" ADD COLUMN "interestRate" DOUBLE PRECISION;
ALTER TABLE "Listing" ADD COLUMN "loanTermYears" INTEGER;
ALTER TABLE "Listing" ADD COLUMN "annualInsurance" INTEGER;
ALTER TABLE "Listing" ADD COLUMN "annualTax" INTEGER;
