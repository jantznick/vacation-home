-- Default new pricing models to diminishing size effect.
ALTER TABLE "PricingModel" ALTER COLUMN "algorithm" SET DEFAULT 'log_size_linear_regression';

-- Upgrade search default models still on the legacy straight-line default.
UPDATE "PricingModel"
SET "algorithm" = 'log_size_linear_regression'
WHERE "isDefault" = true AND "algorithm" = 'linear_regression';
