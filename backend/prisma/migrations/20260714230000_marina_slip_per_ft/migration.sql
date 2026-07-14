-- AlterTable: replace flat slip fee with per-foot rate, add slip notes, drop annualMaintenance
ALTER TABLE "Marina" ADD COLUMN "slipFeePerFtMonthly" DOUBLE PRECISION;
ALTER TABLE "Marina" ADD COLUMN "slipNotes" TEXT;
ALTER TABLE "Marina" DROP COLUMN IF EXISTS "slipFeeMonthly";
ALTER TABLE "Marina" DROP COLUMN IF EXISTS "annualMaintenance";
