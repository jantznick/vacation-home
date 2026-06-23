-- CreateEnum
CREATE TYPE "RegionStatus" AS ENUM ('researching', 'shortlisted', 'ruled_out', 'purchased');

-- CreateEnum
CREATE TYPE "ListingStatus" AS ENUM ('active', 'pending', 'sold', 'off_market', 'interested', 'passed');

-- CreateEnum
CREATE TYPE "CommentTargetType" AS ENUM ('region', 'lake', 'listing');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session" (
    "sid" TEXT NOT NULL,
    "sess" JSONB NOT NULL,
    "expire" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "session_pkey" PRIMARY KEY ("sid")
);

-- CreateTable
CREATE TABLE "Region" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "driveTimeMinutes" INTEGER,
    "driveDistanceMiles" DOUBLE PRECISION,
    "pros" TEXT,
    "cons" TEXT,
    "overallScore" INTEGER,
    "status" "RegionStatus" NOT NULL DEFAULT 'researching',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Region_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lake" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "acreage" DOUBLE PRECISION,
    "maxDepthFeet" DOUBLE PRECISION,
    "avgDepthFeet" DOUBLE PRECISION,
    "waterClarity" TEXT,
    "edgeType" TEXT,
    "notes" TEXT,
    "dnrSourceUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "regionId" TEXT NOT NULL,

    CONSTRAINT "Lake_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Listing" (
    "id" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "sourceSite" TEXT,
    "mlsNumber" TEXT,
    "status" "ListingStatus" NOT NULL DEFAULT 'active',
    "address" TEXT,
    "city" TEXT,
    "state" TEXT DEFAULT 'WI',
    "zip" TEXT,
    "listPrice" INTEGER,
    "soldPrice" INTEGER,
    "isVacantLot" BOOLEAN NOT NULL DEFAULT false,
    "bedrooms" DOUBLE PRECISION,
    "bathrooms" DOUBLE PRECISION,
    "sqftLiving" INTEGER,
    "sqftLot" INTEGER,
    "acres" DOUBLE PRECISION,
    "yearBuilt" INTEGER,
    "waterfront" BOOLEAN NOT NULL DEFAULT false,
    "waterfrontType" TEXT,
    "pros" TEXT,
    "cons" TEXT,
    "notes" TEXT,
    "interestLevel" INTEGER,
    "visited" BOOLEAN NOT NULL DEFAULT false,
    "visitNotes" TEXT,
    "listingDate" TIMESTAMP(3),
    "daysOnMarket" INTEGER,
    "photoUrls" JSONB,
    "fetchedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "regionId" TEXT NOT NULL,
    "lakeId" TEXT,

    CONSTRAINT "Listing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Comment" (
    "id" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "targetType" "CommentTargetType" NOT NULL,
    "targetId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "session_expire_idx" ON "session"("expire");

-- CreateIndex
CREATE UNIQUE INDEX "Region_slug_key" ON "Region"("slug");

-- CreateIndex
CREATE INDEX "Lake_regionId_idx" ON "Lake"("regionId");

-- CreateIndex
CREATE INDEX "Listing_regionId_idx" ON "Listing"("regionId");

-- CreateIndex
CREATE INDEX "Listing_lakeId_idx" ON "Listing"("lakeId");

-- CreateIndex
CREATE INDEX "Listing_isVacantLot_idx" ON "Listing"("isVacantLot");

-- CreateIndex
CREATE INDEX "Listing_status_idx" ON "Listing"("status");

-- CreateIndex
CREATE INDEX "Comment_targetType_targetId_idx" ON "Comment"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "Comment_userId_idx" ON "Comment"("userId");

-- AddForeignKey
ALTER TABLE "Lake" ADD CONSTRAINT "Lake_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "Region"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Listing" ADD CONSTRAINT "Listing_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "Region"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Listing" ADD CONSTRAINT "Listing_lakeId_fkey" FOREIGN KEY ("lakeId") REFERENCES "Lake"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
