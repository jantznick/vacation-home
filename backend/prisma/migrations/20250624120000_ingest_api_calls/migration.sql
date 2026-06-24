-- Track third-party listing import API calls (e.g. ZillAPI) for billing visibility.
CREATE TABLE "IngestApiCall" (
    "id" TEXT NOT NULL,
    "searchId" TEXT,
    "userId" TEXT,
    "provider" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL,
    "httpStatus" INTEGER,
    "creditsCharged" BOOLEAN NOT NULL DEFAULT false,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "sourceUrl" TEXT,
    "zpid" TEXT,
    "requestId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IngestApiCall_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "IngestApiCall_searchId_createdAt_idx" ON "IngestApiCall"("searchId", "createdAt");
CREATE INDEX "IngestApiCall_provider_createdAt_idx" ON "IngestApiCall"("provider", "createdAt");
CREATE INDEX "IngestApiCall_success_idx" ON "IngestApiCall"("success");
