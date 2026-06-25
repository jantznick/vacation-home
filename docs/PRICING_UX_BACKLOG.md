# Pricing UX backlog

Ideas for making price estimation easier to understand, tailor searches, and set expectations before touring or making offers. Plain-language UI only — no statistical jargon on user-facing surfaces.

Related: [PRICING_MODEL_EVOLUTION.md](./PRICING_MODEL_EVOLUTION.md)

---

## High impact

### Budget mode on Price Picker

User sets a target budget; the chart shows where their profile crosses that line (or a soft “affordable band”). Answers: *“Can I get 2 acres on the lake for $400k?”*

### Listing → Price Picker deep link

From listing detail: **“Explore in Price Picker”** pre-fills profile from that property so users can sweep acres, beds, etc. starting from a real listing.

### Saved property profiles

Name and recall dream configs (*“3br lake lot, no waterfront”*) without re-entering fields. Useful for comparing scenarios over weeks of search.

### “What moves the needle?” summary

After an estimate, 2–3 plain-language bullets derived from model direction (not labeled as coefficients): e.g. *“Waterfront adds the most in this region”* or *“Extra acre matters less above 3 acres.”*

### Search budget calculator

Dream-estimator-style entry: *“We have $400k — what’s realistic in Region X?”* Sweep one variable until the estimate hits budget, or show the gap.

---

## Compare & explore

### Compare two profiles on one chart

Overlay or side-by-side: *2 ac vs 5 ac*, or *waterfront yes vs no*, for the same region — makes tradeoffs visceral.

### Expectation ranges when data is thin

With low sample counts, show a soft band (*“roughly $350k–$420k”*) instead of a single precise number. Reinforces that estimates tighten as listings grow.

### $/acre and $/sqft readouts

Always show contextual unit pricing where relevant (land → $/acre, homes → $/sqft at current slider position). Vacant-lot $/acre exists in app today; extend consistently.

### Region sensitivity callouts (marketing + app)

Highlight which region is **most / least affected** by the active variable (steeper vs flatter lines). Shipped on marketing demo first; consider same pattern in app Price Picker.

---

## Onboarding & workflow

### Onboarding nudge after first model

After 3+ priced listings: *“Your model is ready — try Price Picker”* with a direct link.

### Region discovery workflow

Use Price Picker as step 2 after defining regions: *“Which towns fit your size and budget?”* before saving many listings.

### Marketing → signup handoff

**“Save this profile”** on the demo CTA that pre-seeds a search (or dream spec) after registration.

### Price history vs model over time

On listing cards or detail: whether ask has moved toward or away from the model since first save.

---

## Nice to have

### Compare listing ask to picker scenario

*“This listing is priced like a 4ac waterfront profile in Eagle River”* — reverse direction from deep link.

### Share picker snapshot

Read-only link or image export of current profile + chart for partner discussions.

### Variable “importance” ordering

Order pills by approximate impact for current profile/region (big movers first).

---

## Explicitly deferred

- Technical metric dashboards (R², MAE, etc.)
- Automated “best algorithm” picker without user-visible explanation
- Black-box ML explanations

---

## Priority suggestion (for planning)

| Order | Item | Why |
|-------|------|-----|
| 1 | Listing → Price Picker deep link | Connects daily research to flagship feature |
| 2 | Saved profiles | Reduces friction for long searches |
| 3 | Budget mode | Answers the most common early question |
| 4 | What moves the needle | Builds trust without jargon |
| 5 | Expectation ranges | Honest about thin data |
