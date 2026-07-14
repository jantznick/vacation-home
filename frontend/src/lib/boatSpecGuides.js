/**
 * Plain-language guides for boat encyclopedia metrics.
 * Aimed at shoppers who aren't naval architects — why care, plus rough ranges.
 */

export const BOAT_SPEC_TIPS = {
  length: {
    title: 'Length overall (LOA)',
    body: 'Tip-to-tip length of the boat. It drives slip fees, marina fit, docking stress, and usually price. Bigger is not always better — match length to how and where you actually sail.',
  },
  waterline: {
    title: 'Waterline length (LWL)',
    body: 'The length sitting in the water. It matters more than overall length for theoretical top speed and how the boat moves in waves. A longer waterline generally means a higher hull speed and a smoother ride.',
  },
  beam: {
    title: 'Beam',
    body: 'Maximum width. Wider boats feel roomier below and more stable at the dock, but a very wide boat can slap harder offshore and may need a wider slip. Useful when comparing “feel” and marina cost.',
  },
  draft: {
    title: 'Draft',
    body: 'How deep the keel goes. Deeper draft usually means better upwind performance and more righting power; shallower draft opens more harbors, beaches, and skinny water. Decide based on where you’ll sail, not just performance bragging rights.',
  },
  sailArea: {
    title: 'Sail area',
    body: 'Roughly the boat’s “horsepower.” More area helps in light wind; too much can mean earlier reefing when it’s blowing. Compare alongside displacement (see sail / displacement) rather than alone.',
  },
  displacement: {
    title: 'Displacement',
    body: 'How heavy the boat is in the water. Heavier boats often feel more solid in a seaway and carry more gear, but they cost more to haul, move slower to accelerate, and need more sail to stay lively. Lighter boats are quicker to get going and often cheaper to keep.',
  },
  ballast: {
    title: 'Ballast',
    body: 'Weight (usually lead or iron) low in the keel that helps the boat stand up to wind. The percentage is ballast ÷ displacement. Many cruising sailboats land around the high-20s to high-30s%. Higher ballast ratios often feel stiffer; it isn’t the only stability factor.',
  },
  saDispl: {
    title: 'Sail area / displacement',
    body: 'Power-to-weight for the sail plan. Rough guide: under ~16 feels underpowered in light air; ~16–20 typical cruiser; ~20–24 sporty cruiser; mid-20s and up is performance-oriented. Higher numbers mean more zip — and usually earlier reefing when it blows.',
  },
  dispLen: {
    title: 'Displacement / length',
    body: 'How heavy the boat is for its waterline. Rough guide: under ~100 ultralight; ~100–200 light; ~200–300 medium; 300+ heavy. Lighter for length is usually faster and more lively; heavier often softer in a chop but needs more sail to move well.',
  },
  comfort: {
    title: 'Comfort ratio',
    body: 'A classic Ted Brewer shorthand for motion comfort in a seaway (higher usually means an easier ride). Very rough ballpark: under ~20 racey/sportsboat; ~20–30 coastal cruiser; ~30–40 more passagemaker comfort. It’s a screen, not a verdict — cabin layout and keel still matter hugely.',
  },
  capsize: {
    title: 'Capsize screening',
    body: 'A rule-of-thumb screening number for resistance to being rolled. Lower is generally better for offshore work; under 2.0 is the traditional ocean-cruising preferred zone. It is only a screen — not a guarantee of safety — and works best comparing similar-sized boats.',
  },
  hullSpeed: {
    title: 'Hull speed',
    body: 'A theoretical “sweet spot” speed for a displacement hull, based mostly on waterline length (about 1.34 × √LWL in knots). You can go faster surfing or with a planing hull, but it’s a useful apples-to-apples cruise-speed expectation.',
  },
  hull: {
    title: 'Hull type',
    body: 'The underwater shape (fin keel, full keel, wing, bulb, centerboard, etc.). It affects pointing ability, draft, grounding forgiveness, and how the boat tracks. Fin+bulb is common on modern performance cruisers; full keels favor directional stability and toughness.',
  },
  rig: {
    title: 'Rig type',
    body: 'How the mast and sails are set up (sloop, cutter, ketch, fractional vs masthead, etc.). This changes sail handling, how you reef, and what crewing feels like. Fractional sloops are common on sportier modern boats — powerful headsails, earlier reefing of the main.',
  },
  designer: {
    title: 'Designer',
    body: 'Who drew the boat. Design houses often have a reputation (racing pedigree, bluewater focus, coastal comfort). Useful when you’re reading reviews or comparing sisterships.',
  },
  builder: {
    title: 'Builder',
    body: 'Who built her. Production builders vary in quality eras, common refit issues, and how easy parts and know-how are to find. Pair this with year built and owner forums for real-world maintenance expectations.',
  },
  construction: {
    title: 'Construction',
    body: 'What the boat is made of (usually fiberglass on modern production boats). Material drives survey focus, repair methods, and longevity. “Fiberglass” still varies a lot by era and build quality.',
  },
  built: {
    title: 'Years built',
    body: 'Production span. Longer runs often mean more examples afloat, better-known gotchas, and easier comparable sales. Early vs late years of a model can differ in tanks, interiors, and rig tweaks.',
  },
  builtCount: {
    title: 'Number built',
    body: 'How many of this model were made. Higher numbers usually mean more owner knowledge online, more used-market comps, and easier soft goods / parts hunts. Rare boats can be special — and harder to value or support.',
  },
  engine: {
    title: 'Engine',
    body: 'Auxiliary power for docking, calms, and charging. Horsepower and brand matter for spares, mechanic familiarity, and whether the boat motors adequately into wind and chop for its size.',
  },
  fuel: {
    title: 'Fuel capacity',
    body: 'How far you can motor and how long you can run electronics/heater without filling up. Coastal weekenders need less; longer passages or island-hopping want more — especially if you motor in calms a lot.',
  },
  water: {
    title: 'Water capacity',
    body: 'Freshwater tankage for drinking, cooking, and showers. Bigger tanks buy independence from marinas; many crews still plan around watermakers or jerry cans on longer trips.',
  },
};

export function tipForSpec(id) {
  return BOAT_SPEC_TIPS[id] || null;
}
