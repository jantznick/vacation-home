-- Replace individual slip fee fields with a JSON array of slip options
ALTER TABLE "Marina" ADD COLUMN "slipOptions" JSONB;
ALTER TABLE "Marina" DROP COLUMN IF EXISTS "slipFeePerFtMonthly";
ALTER TABLE "Marina" DROP COLUMN IF EXISTS "slipNotes";
