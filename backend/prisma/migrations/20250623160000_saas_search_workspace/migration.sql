-- CreateEnum
CREATE TYPE "SearchMemberRole" AS ENUM ('owner', 'editor', 'viewer');
CREATE TYPE "PoiType" AS ENUM ('current_home', 'work', 'school', 'family', 'other');

-- CreateTable Search
CREATE TABLE "Search" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Search_pkey" PRIMARY KEY ("id")
);

-- CreateTable SearchMember
CREATE TABLE "SearchMember" (
    "id" TEXT NOT NULL,
    "searchId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "SearchMemberRole" NOT NULL DEFAULT 'editor',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SearchMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable SearchInvite
CREATE TABLE "SearchInvite" (
    "id" TEXT NOT NULL,
    "searchId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "SearchMemberRole" NOT NULL DEFAULT 'editor',
    "token" TEXT NOT NULL,
    "invitedById" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SearchInvite_pkey" PRIMARY KEY ("id")
);

-- CreateTable PointOfInterest
CREATE TABLE "PointOfInterest" (
    "id" TEXT NOT NULL,
    "searchId" TEXT NOT NULL,
    "type" "PoiType" NOT NULL DEFAULT 'other',
    "label" TEXT NOT NULL,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zip" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PointOfInterest_pkey" PRIMARY KEY ("id")
);

-- CreateTable ListingCommute
CREATE TABLE "ListingCommute" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "poiId" TEXT NOT NULL,
    "driveTimeMinutes" INTEGER,
    "driveDistanceMiles" DOUBLE PRECISION,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ListingCommute_pkey" PRIMARY KEY ("id")
);

-- Add nullable searchId columns
ALTER TABLE "Region" ADD COLUMN "searchId" TEXT;
ALTER TABLE "Listing" ADD COLUMN "searchId" TEXT;
ALTER TABLE "PricingModel" ADD COLUMN "searchId" TEXT;

-- Migrate existing data into a default search (first user becomes owner)
DO $$
DECLARE
  default_user_id TEXT;
  default_search_id TEXT := gen_random_uuid()::text;
BEGIN
  SELECT "id" INTO default_user_id FROM "User" ORDER BY "createdAt" ASC LIMIT 1;

  IF default_user_id IS NOT NULL THEN
    INSERT INTO "Search" ("id", "name", "slug", "description", "createdById", "createdAt", "updatedAt")
    VALUES (
      default_search_id,
      'My North Woods Search',
      'my-north-woods-search',
      'Migrated from local dev data',
      default_user_id,
      CURRENT_TIMESTAMP,
      CURRENT_TIMESTAMP
    );

    INSERT INTO "SearchMember" ("id", "searchId", "userId", "role", "joinedAt")
    SELECT gen_random_uuid()::text, default_search_id, "id", 'owner', CURRENT_TIMESTAMP
    FROM "User";

    UPDATE "Region" SET "searchId" = default_search_id WHERE "searchId" IS NULL;
    UPDATE "Listing" SET "searchId" = default_search_id WHERE "searchId" IS NULL;
    UPDATE "PricingModel" SET "searchId" = default_search_id WHERE "searchId" IS NULL;

    -- Migrate user home addresses to primary POIs
    INSERT INTO "PointOfInterest" (
      "id", "searchId", "type", "label", "address", "city", "state", "zip",
      "latitude", "longitude", "isPrimary", "sortOrder", "createdAt", "updatedAt"
    )
    SELECT
      gen_random_uuid()::text,
      default_search_id,
      'current_home'::"PoiType",
      'Home',
      u."homeAddress",
      u."homeCity",
      u."homeState",
      u."homeZip",
      u."homeLat",
      u."homeLng",
      true,
      0,
      CURRENT_TIMESTAMP,
      CURRENT_TIMESTAMP
    FROM "User" u
    WHERE u."id" = default_user_id
      AND (u."homeAddress" IS NOT NULL OR u."homeCity" IS NOT NULL);
  END IF;
END $$;

-- Enforce NOT NULL (only if rows exist they were updated; empty tables are fine)
ALTER TABLE "Region" ALTER COLUMN "searchId" SET NOT NULL;
ALTER TABLE "Listing" ALTER COLUMN "searchId" SET NOT NULL;
ALTER TABLE "PricingModel" ALTER COLUMN "searchId" SET NOT NULL;

-- Drop old Region slug unique, add per-search unique
DROP INDEX IF EXISTS "Region_slug_key";
CREATE UNIQUE INDEX "Region_searchId_slug_key" ON "Region"("searchId", "slug");

-- Indexes
CREATE UNIQUE INDEX "Search_slug_key" ON "Search"("slug");
CREATE UNIQUE INDEX "SearchMember_searchId_userId_key" ON "SearchMember"("searchId", "userId");
CREATE INDEX "SearchMember_userId_idx" ON "SearchMember"("userId");
CREATE UNIQUE INDEX "SearchInvite_token_key" ON "SearchInvite"("token");
CREATE UNIQUE INDEX "SearchInvite_searchId_email_key" ON "SearchInvite"("searchId", "email");
CREATE INDEX "SearchInvite_token_idx" ON "SearchInvite"("token");
CREATE INDEX "PointOfInterest_searchId_idx" ON "PointOfInterest"("searchId");
CREATE UNIQUE INDEX "ListingCommute_listingId_poiId_key" ON "ListingCommute"("listingId", "poiId");
CREATE INDEX "ListingCommute_listingId_idx" ON "ListingCommute"("listingId");
CREATE INDEX "ListingCommute_poiId_idx" ON "ListingCommute"("poiId");
CREATE INDEX "Region_searchId_idx" ON "Region"("searchId");
CREATE INDEX "Listing_searchId_idx" ON "Listing"("searchId");
CREATE INDEX "PricingModel_searchId_idx" ON "PricingModel"("searchId");

-- Foreign keys
ALTER TABLE "Search" ADD CONSTRAINT "Search_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SearchMember" ADD CONSTRAINT "SearchMember_searchId_fkey" FOREIGN KEY ("searchId") REFERENCES "Search"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SearchMember" ADD CONSTRAINT "SearchMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SearchInvite" ADD CONSTRAINT "SearchInvite_searchId_fkey" FOREIGN KEY ("searchId") REFERENCES "Search"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SearchInvite" ADD CONSTRAINT "SearchInvite_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PointOfInterest" ADD CONSTRAINT "PointOfInterest_searchId_fkey" FOREIGN KEY ("searchId") REFERENCES "Search"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ListingCommute" ADD CONSTRAINT "ListingCommute_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ListingCommute" ADD CONSTRAINT "ListingCommute_poiId_fkey" FOREIGN KEY ("poiId") REFERENCES "PointOfInterest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Region" ADD CONSTRAINT "Region_searchId_fkey" FOREIGN KEY ("searchId") REFERENCES "Search"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Listing" ADD CONSTRAINT "Listing_searchId_fkey" FOREIGN KEY ("searchId") REFERENCES "Search"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PricingModel" ADD CONSTRAINT "PricingModel_searchId_fkey" FOREIGN KEY ("searchId") REFERENCES "Search"("id") ON DELETE CASCADE ON UPDATE CASCADE;
