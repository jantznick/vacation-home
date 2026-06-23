-- AlterTable
ALTER TABLE "Listing" ADD COLUMN "rawScrapedData" JSONB;

-- CreateTable
CREATE TABLE "ListingSnapshot" (
    "id" TEXT NOT NULL,
    "listPrice" INTEGER,
    "soldPrice" INTEGER,
    "status" "ListingStatus",
    "daysOnMarket" INTEGER,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "listingId" TEXT NOT NULL,

    CONSTRAINT "ListingSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ListingSnapshot_listingId_idx" ON "ListingSnapshot"("listingId");

-- CreateIndex
CREATE INDEX "ListingSnapshot_capturedAt_idx" ON "ListingSnapshot"("capturedAt");

-- AddForeignKey
ALTER TABLE "ListingSnapshot" ADD CONSTRAINT "ListingSnapshot_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;
