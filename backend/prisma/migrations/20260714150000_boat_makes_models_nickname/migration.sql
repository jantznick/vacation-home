-- AlterTable
ALTER TABLE "Listing" ADD COLUMN "nickname" TEXT;
ALTER TABLE "Listing" ADD COLUMN "boatMakeId" TEXT;
ALTER TABLE "Listing" ADD COLUMN "boatModelId" TEXT;

-- CreateTable
CREATE TABLE "BoatMake" (
    "id" TEXT NOT NULL,
    "searchId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "pros" TEXT,
    "cons" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BoatMake_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BoatModel" (
    "id" TEXT NOT NULL,
    "makeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "pros" TEXT,
    "cons" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BoatModel_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BoatMake_searchId_idx" ON "BoatMake"("searchId");

-- CreateIndex
CREATE UNIQUE INDEX "BoatMake_searchId_slug_key" ON "BoatMake"("searchId", "slug");

-- CreateIndex
CREATE INDEX "BoatModel_makeId_idx" ON "BoatModel"("makeId");

-- CreateIndex
CREATE UNIQUE INDEX "BoatModel_makeId_slug_key" ON "BoatModel"("makeId", "slug");

-- CreateIndex
CREATE INDEX "Listing_boatMakeId_idx" ON "Listing"("boatMakeId");

-- CreateIndex
CREATE INDEX "Listing_boatModelId_idx" ON "Listing"("boatModelId");

-- AddForeignKey
ALTER TABLE "BoatMake" ADD CONSTRAINT "BoatMake_searchId_fkey" FOREIGN KEY ("searchId") REFERENCES "Search"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BoatModel" ADD CONSTRAINT "BoatModel_makeId_fkey" FOREIGN KEY ("makeId") REFERENCES "BoatMake"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Listing" ADD CONSTRAINT "Listing_boatMakeId_fkey" FOREIGN KEY ("boatMakeId") REFERENCES "BoatMake"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Listing" ADD CONSTRAINT "Listing_boatModelId_fkey" FOREIGN KEY ("boatModelId") REFERENCES "BoatModel"("id") ON DELETE SET NULL ON UPDATE CASCADE;
