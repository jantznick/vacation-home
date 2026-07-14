-- AlterTable
ALTER TABLE "Listing" ADD COLUMN "shortlisted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Listing" ADD COLUMN "shortlistRank" INTEGER;

-- CreateIndex
CREATE INDEX "Listing_shortlisted_idx" ON "Listing"("shortlisted");
