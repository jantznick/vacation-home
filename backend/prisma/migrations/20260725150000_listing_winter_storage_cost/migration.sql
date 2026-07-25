-- Listing-level winter storage override (null = marina or search costDefaults)
ALTER TABLE "Listing" ADD COLUMN "winterStorageCost" INTEGER;
