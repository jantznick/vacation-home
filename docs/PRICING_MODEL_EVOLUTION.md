# Pricing model evolution

This document describes how price estimation models work today, planned improvements, and how we evaluate them **without exposing statistical jargon in the product UI**.

## Product principles

- **Plain language only in the UI.** Users see confidence notes (“based on only 5 homes”), fit caveats, and qualitative guidance — never R², MAE, RMSE, or similar terms.
- **Internal metrics are fine.** Training still computes error stats server-side for development and future automated model selection. They are not surfaced to users.
- **Small data is normal.** Most searches have a handful to a few dozen priced listings. Models must stay stable and interpretable at that scale.
- **One stored model, trained on all listings** per segment (all / region / similar). List and detail views read cached segments — no refit on page load.

## Current architecture

| Piece | Role |
|-------|------|
| `backend/lib/pricingFeatures.js` | Feature catalog, vectorization, training matrix, vacant-lot & sparse interactions |
| `backend/lib/pricingRegression.js` | OLS / ridge fit, predict, leave-one-out validation |
| `backend/services/pricing/index.js` | Fit segments, predict, retrain on listing changes, Price Picker sensitivity |
| `PricingModel` (Prisma) | `features`, `algorithm`, `modelData.segments` |
| **Pricing models** (`/searches/:id/pricing-models`) | Create model, pick algorithm, train, fit feedback scatter |
| **Price picker** (`/searches/:id/price-picker`) | One-variable sensitivity curves from stored `segments.all` |
| **Dream estimator** (`/searches/:id/estimator`) | Point estimates for a hypothetical property |
| Listing detail / list cards | Cached tier predictions (all / region / similar) |

### Algorithms

| Key | UI name | Behavior |
|-----|---------|----------|
| `linear_regression` | **Straight-line** | Each feature adds/subtracts a fixed dollar amount. Sensitivity curves are straight lines. |
| `log_size_linear_regression` | **Diminishing size effect** *(default)* | Acres, living sqft, and lot sqft are log-transformed before regression. Price still predicted in dollars, but size features taper off — sensitivity curves bend for lot/house size. |

Booleans (waterfront, vacant lot), beds, baths, region, year built, and days on market stay linear in both modes.

### Vacant lot handling

When `isVacantLot` is in the model feature set:

- **Training:** Vacant listings use `sqftLiving = 0`; beds/baths/year built are imputed or omitted from the synthetic profile.
- **Mixed searches:** If priced listings include **both** vacant lots and homes, the trainer adds **interaction columns** (e.g. `acres × vacant lot`) so lot size and waterfront can move price differently on land vs structures. Requires a **retrain** after adding the first opposite type.
- **Price Picker:** Pinning “Vacant lot = Yes” hides house-only fields; when exploring acres, shows an approximate **$/acre** at the current slider position.

### Regularization & sparse interactions

Training automatically applies extra techniques when data is thin relative to model complexity:

- **Ridge regression** activates when feature count approaches sample size (many regions + features on few listings). Coefficients are smoothed so estimates stay stable — surfaced in fit feedback as “estimates are smoothed to stay stable,” never as “ridge” or “L2.”
- **Sparse interactions** (currently `waterfront × acres` and `waterfront × sqftLiving`) are added **one at a time** only if leave-one-out error improves meaningfully on your saved listings. Fit feedback explains when a waterfront/size interaction was learned.
- Retrain required for ridge/sparse changes to apply to stored segments.

## Why log-size (v2)

Vacation and land listings often span wide size ranges. The first acre frequently matters more than the tenth. A straight line cannot express that with a single acres coefficient. Log-size features approximate “diminishing returns” without jumping to complex ML that overfits small samples.

## Roadmap

### Phase 1 — Log-size algorithm ✅

- Selectable when creating a pricing model
- Stored on `PricingModel.algorithm` and each trained segment
- Price Picker automatically shows curved lines for size variables when this algorithm is active
- Retrain required when switching algorithm

### Phase 2 — Fit feedback (plain language) ✅

- Predicted vs actual scatter on Pricing Models (all listings segment)
- Copy like “Estimates were within about $X of list prices on your saved homes” — derived from internal error stats, not labeled with technical terms
- “Limited data” / “Rough ballpark” / “Wide spread” warnings when the model fits poorly

### Price Picker — Pin vs Any ✅

- **Pinned (default):** You set a specific value; it is held constant while exploring another variable (same as before).
- **Any:** You are flexible on that detail. The model uses a **standard value learned from your saved listings** (segment impute mean) — no new model or retrain required.
- Region is always pinned. Selecting a variable as the active chart pill automatically pins it if it was Any.
- UI copy explains that Any is approximate; pinning a real value may shift the estimate up or down.

### Price Picker — Multi-region compare ✅

- Select **multiple regions** in the profile (checkboxes). No model retrain — each line uses the same stored model with a different region coefficient.
- When 2+ regions are selected and you explore acres, sqft, etc., the chart shows **one colored line per region** on the same axes.
- A steeper line means that detail moves price more in that region (e.g. lot size matters more in one area than another).
- Estimated price list updates per region at the current slider position; click a region in the legend or list to focus it.

### Phase 3 — Vacant lot vs home ✅

- When a search has **both** vacant lots and homes with prices, training adds interaction terms (`acres × vacant`, `sqftLot × vacant`, `waterfront × vacant` when those features are enabled).
- Homes keep the main-effect coefficients; vacant lots get an additional slope via the interaction — approximating “$/acre land” vs “$/sqft home” in one model.
- Price Picker shows **$/acre** when vacant lot is pinned Yes and acres are set.
- Fit feedback notes when mixed land + home data is driving separate slopes.
- Retrain required for interactions to appear on an existing model.

### Phase 4 — Regularization & interactions ✅

- **Ridge regression** when `featureCount >= sampleCount - 2` or `featureCount / sampleCount >= 0.5` — automatic at train time, stored as `regressionMethod: 'ridge'` on each segment
- **Sparse interactions** validated with leave-one-out MAE before inclusion (at most one per train: `waterfront × acres` or `waterfront × sqftLiving`)
- Plain-language fit feedback when smoothing or a waterfront/size interaction is active
- Retrain required for stored segments to pick up new behavior

### Default algorithm & auto-migration ✅

- **Default for new models:** `log_size_linear_regression` (Diminishing size effect)
- **Training pipeline version** (`trainingPipelineVersion` on `modelData`) — bump when training output changes; stale models auto-retrain
- **On server startup:** all pricing models checked; outdated ones retrained in the background
- **On first use** (listing estimate, price picker, dream estimator): lazy upgrade if still stale
- **Default search models** still on straight-line are upgraded to diminishing size effect; custom models that explicitly chose straight-line keep that choice but still retrain for pipeline improvements

### Future ideas

- More sparse interaction candidates (e.g. region × waterfront), each validated the same way
- Automatic algorithm selection when log-size clearly beats straight-line on a search

### Explicitly deferred

- Random forests, neural nets, heavy polynomial bases on per-search data
- Leave-one-out refit on list/detail views
- Technical metric dashboards for end users
- Separate vacant-only / home-only model segments (interactions preferred for small samples)

## API surface (pricing)

| Endpoint | Purpose |
|----------|---------|
| `GET /api/searches/:id/pricing-models` | List models |
| `POST /api/searches/:id/pricing-models` | Create (`features`, `algorithm`) |
| `POST /api/searches/:id/pricing-models/:id/train` | Retrain all segments |
| `GET /api/searches/:id/pricing-models/:id/fit` | Plain-language fit feedback + scatter points |
| `POST /api/searches/:id/pricing-models/sensitivity` | Price Picker curve (`spec`, `variable`, `anyFeatures`, `regionIds`) |
| `POST /api/searches/:id/estimator` | Dream estimator tiers |

## Evaluating model changes (internal)

When comparing algorithms on real searches:

1. Train both on the same listings and segments.
2. Compare internal MAE / R² offline.
3. Sanity-check direction: waterfront premium, larger lots cost more, region ordering makes sense.
4. Reject fits that produce negative or absurd prices.
5. Prefer the simpler model unless the alternative is clearly better on **multiple** searches.
6. For mixed land/home searches, check whether vacant lots and homes are both represented and whether acre slopes look reasonable per type.

## UI copy guidelines

| Instead of | Use |
|------------|-----|
| R² = 0.82 | “Estimates track your saved list prices fairly closely” |
| High MAE | “Estimates are often off by $50k+ — add more listings or simplify features” |
| Log-linear regression | “Diminishing size effect” |
| Linear regression | “Straight-line” |
| Partial dependence | “How price changes when you adjust one property detail” |
| Impute mean | “Typical value from your saved listings” (Price Picker **Any**) |
| Interaction term | “Lot size and waterfront can affect land and homes differently” |
| Ridge / L2 | “Estimates are smoothed to stay stable” |
| Waterfront × acres | “Waterfront premium varies with lot size” |
| Price per acre | “About $X per acre at this lot size” |

## Related pages

- **Pricing models** — create, train, pick default algorithm, view fit chart
- **Price picker** — explore one variable at a time; multi-region compare; Pin/Any
- **Dream estimator** — point estimates for a hypothetical property

## Related docs

- [PRICING_UX_BACKLOG.md](./PRICING_UX_BACKLOG.md) — future pricing UX ideas
- [LISTING_DATA_AND_PRICING_OVER_TIME.md](./LISTING_DATA_AND_PRICING_OVER_TIME.md) — refresh, sold listings, models over time
