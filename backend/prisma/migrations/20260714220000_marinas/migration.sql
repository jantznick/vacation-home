-- CreateTable
CREATE TABLE "Marina" (
    "id" TEXT NOT NULL,
    "searchId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "driveTimeMinutes" INTEGER,
    "driveDistanceMiles" DOUBLE PRECISION,
    "website" TEXT,
    "slipFeeMonthly" INTEGER,
    "winterStorageCost" INTEGER,
    "annualMaintenance" INTEGER,
    "liveaboardAllowed" BOOLEAN NOT NULL DEFAULT false,
    "seasonOpen" INTEGER,
    "seasonClose" INTEGER,
    "yearRound" BOOLEAN NOT NULL DEFAULT true,
    "amenities" TEXT,
    "maxLengthFt" DOUBLE PRECISION,
    "maxDraftFt" DOUBLE PRECISION,
    "pros" TEXT,
    "cons" TEXT,
    "notes" TEXT,
    "overallScore" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Marina_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Marina_searchId_slug_key" ON "Marina"("searchId", "slug");

-- CreateIndex
CREATE INDEX "Marina_searchId_idx" ON "Marina"("searchId");

-- AlterTable
ALTER TABLE "Listing" ADD COLUMN "marinaId" TEXT;

-- CreateIndex
CREATE INDEX "Listing_marinaId_idx" ON "Listing"("marinaId");

-- AddForeignKey
ALTER TABLE "Marina" ADD CONSTRAINT "Marina_searchId_fkey" FOREIGN KEY ("searchId") REFERENCES "Search"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Listing" ADD CONSTRAINT "Listing_marinaId_fkey" FOREIGN KEY ("marinaId") REFERENCES "Marina"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterEnum
ALTER TYPE "CommentTargetType" ADD VALUE 'marina';
