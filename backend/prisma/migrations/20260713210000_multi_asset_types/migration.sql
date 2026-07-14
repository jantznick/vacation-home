-- AlterEnum
CREATE TYPE "AssetType" AS ENUM ('home', 'boat', 'rv');

-- AlterEnum
CREATE TYPE "BoatPropulsion" AS ENUM ('sail', 'motor', 'other');

-- AlterTable Search
ALTER TABLE "Search" ADD COLUMN "assetType" "AssetType" NOT NULL DEFAULT 'home';
ALTER TABLE "Search" ADD COLUMN "pros" TEXT;
ALTER TABLE "Search" ADD COLUMN "cons" TEXT;

CREATE INDEX "Search_assetType_idx" ON "Search"("assetType");

-- AlterTable Listing: boat fields + optional region
ALTER TABLE "Listing" ADD COLUMN "lengthFt" DOUBLE PRECISION;
ALTER TABLE "Listing" ADD COLUMN "make" TEXT;
ALTER TABLE "Listing" ADD COLUMN "model" TEXT;
ALTER TABLE "Listing" ADD COLUMN "propulsion" "BoatPropulsion";

ALTER TABLE "Listing" DROP CONSTRAINT "Listing_regionId_fkey";
ALTER TABLE "Listing" ALTER COLUMN "regionId" DROP NOT NULL;
ALTER TABLE "Listing" ADD CONSTRAINT "Listing_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "Region"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "Listing_propulsion_idx" ON "Listing"("propulsion");
