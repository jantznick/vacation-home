DROP TABLE "LoginToken";

CREATE TABLE "MagicToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MagicToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MagicToken_token_key" ON "MagicToken"("token");
CREATE INDEX "MagicToken_email_idx" ON "MagicToken"("email");
CREATE INDEX "MagicToken_expiresAt_idx" ON "MagicToken"("expiresAt");
