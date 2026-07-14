export const DEFAULT_SCENARIO_ID = 'forest';

const FOREST_THEME = {
  pageBg: 'bg-pine-50',
  heroBorder: 'border-pine-200',
  heroRadial:
    'bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(79,125,98,0.2),transparent)]',
  heroDots:
    'opacity-[0.35] [background-image:radial-gradient(rgba(50,80,64,0.12)_1px,transparent_1px)] [background-size:24px_24px]',
  accent: 'text-pine-600',
  badge: 'border-pine-200 bg-white/80 text-pine-700',
  heroGlow: 'from-pine-200/60 to-bark-200/40',
  selectorLabel: 'text-pine-800',
  selectorActive: 'border-transparent bg-pine-700 text-white shadow-sm',
  selectorIdle:
    'border-transparent bg-white text-pine-700 hover:bg-pine-50',
  pricingSection:
    'border-pine-800 bg-gradient-to-b from-pine-950 via-pine-900 to-pine-900',
  pricingCard: 'border-pine-700/60 bg-pine-800/40',
  pricingHighlight: 'text-emerald-300',
  pricingBullet: 'bg-emerald-400',
  pricingTag: 'border-pine-600 bg-pine-800 text-pine-100',
  pricingWhyBox: 'border-pine-700/60 bg-pine-950/50',
  featuresCard: 'border-pine-200 bg-white hover:shadow-pine-900/5',
  stepsSection: 'border-pine-200 bg-gradient-to-b from-pine-50 to-white',
  stepsLine: 'bg-pine-200',
  stepCircle: 'bg-pine-700',
  ctaBorder: 'border-pine-700/50',
  ctaBg: 'bg-gradient-to-br from-pine-900 via-pine-900 to-pine-800',
  ctaGlow: 'bg-[radial-gradient(circle_at_70%_0%,rgba(111,153,128,0.28),transparent_55%)]',
  primaryBtn: '!bg-pine-700 !text-white hover:!bg-pine-800',
  headerBorder: 'border-pine-200/80',
  logoHover: 'group-hover:text-pine-700',
  navLink: 'text-pine-700 hover:bg-pine-50 hover:text-pine-900',
  featureIcon: 'bg-pine-100 text-pine-700',
  selectorGroup: 'bg-white shadow-md ring-1 ring-pine-900/10',
  secondaryBtn: 'border-pine-300 hover:bg-pine-50',
  demoBorder: 'border-pine-200/80',
  demoHeaderBorder: 'border-pine-100',
  demoHeaderBg: 'bg-pine-50/80',
  demoShadow: 'shadow-pine-900/10 ring-pine-900/5',
  demoTabActive: 'bg-pine-700 text-white',
  demoTabIdle: 'bg-pine-100 text-pine-700 hover:bg-pine-200',
  demoStatBg: 'bg-pine-50',
};

const BEACH_THEME = {
  pageBg: 'bg-sand-50',
  heroBorder: 'border-ocean-200',
  heroRadial:
    'bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(14,165,233,0.15),transparent)]',
  heroDots:
    'opacity-[0.4] [background-image:radial-gradient(rgba(2,132,199,0.1)_1px,transparent_1px)] [background-size:24px_24px]',
  accent: 'text-ocean-700',
  badge: 'border-ocean-200 bg-white/90 text-ocean-800',
  heroGlow: 'from-ocean-100/80 to-sand-100/80',
  selectorLabel: 'text-ocean-900',
  selectorActive: 'border-transparent bg-ocean-700 text-white shadow-sm',
  selectorIdle:
    'border-transparent bg-white text-ocean-800 hover:bg-ocean-50',
  pricingSection:
    'border-ocean-900 bg-gradient-to-b from-ocean-950 via-ocean-900 to-ocean-900',
  pricingCard: 'border-ocean-700/50 bg-ocean-800/35',
  pricingHighlight: 'text-ocean-200',
  pricingBullet: 'bg-ocean-400',
  pricingTag: 'border-ocean-600 bg-ocean-800/80 text-ocean-100',
  pricingWhyBox: 'border-ocean-700/50 bg-ocean-950/40',
  featuresCard: 'border-ocean-100 bg-white hover:shadow-ocean-900/5',
  stepsSection: 'border-ocean-100 bg-gradient-to-b from-sand-50 to-white',
  stepsLine: 'bg-ocean-200',
  stepCircle: 'bg-ocean-700',
  ctaBorder: 'border-ocean-600/40',
  ctaBg: 'bg-gradient-to-br from-ocean-950 via-ocean-900 to-ocean-800',
  ctaGlow: 'bg-[radial-gradient(circle_at_70%_0%,rgba(56,189,248,0.22),transparent_55%)]',
  primaryBtn: '!bg-ocean-700 !text-white hover:!bg-ocean-800',
  headerBorder: 'border-ocean-200/80',
  logoHover: 'group-hover:text-ocean-700',
  navLink: 'text-ocean-800 hover:bg-ocean-50 hover:text-ocean-900',
  featureIcon: 'bg-ocean-100 text-ocean-700',
  selectorGroup: 'bg-white shadow-md ring-1 ring-ocean-900/10',
  secondaryBtn: 'border-ocean-300 hover:bg-ocean-50',
  demoBorder: 'border-ocean-200/80',
  demoHeaderBorder: 'border-ocean-100',
  demoHeaderBg: 'bg-ocean-50/80',
  demoShadow: 'shadow-ocean-900/10 ring-ocean-900/5',
  demoTabActive: 'bg-ocean-700 text-white',
  demoTabIdle: 'bg-ocean-100 text-ocean-800 hover:bg-ocean-200',
  demoStatBg: 'bg-ocean-50',
};

const SKI_THEME = {
  pageBg: 'bg-alpine-50',
  heroBorder: 'border-alpine-200',
  heroRadial:
    'bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(56,189,248,0.12),transparent)]',
  heroDots:
    'opacity-[0.35] [background-image:radial-gradient(rgba(51,65,85,0.12)_1px,transparent_1px)] [background-size:24px_24px]',
  accent: 'text-alpine-600',
  badge: 'border-alpine-200 bg-white/90 text-alpine-800',
  heroGlow: 'from-alpine-100/80 to-ice-400/20',
  selectorLabel: 'text-alpine-900',
  selectorActive: 'border-transparent bg-alpine-800 text-white shadow-sm',
  selectorIdle:
    'border-transparent bg-white text-alpine-700 hover:bg-alpine-50',
  pricingSection:
    'border-alpine-800 bg-gradient-to-b from-alpine-950 via-alpine-900 to-alpine-900',
  pricingCard: 'border-alpine-600/40 bg-alpine-800/35',
  pricingHighlight: 'text-ice-400',
  pricingBullet: 'bg-ice-400',
  pricingTag: 'border-alpine-600 bg-alpine-800/80 text-alpine-100',
  pricingWhyBox: 'border-alpine-600/40 bg-alpine-950/40',
  featuresCard: 'border-alpine-200 bg-white hover:shadow-alpine-900/5',
  stepsSection: 'border-alpine-200 bg-gradient-to-b from-alpine-50 to-white',
  stepsLine: 'bg-alpine-200',
  stepCircle: 'bg-alpine-800',
  ctaBorder: 'border-alpine-600/40',
  ctaBg: 'bg-gradient-to-br from-alpine-950 via-alpine-900 to-alpine-800',
  ctaGlow: 'bg-[radial-gradient(circle_at_70%_0%,rgba(148,163,184,0.2),transparent_55%)]',
  primaryBtn: '!bg-alpine-800 !text-white hover:!bg-alpine-900',
  headerBorder: 'border-alpine-200/80',
  logoHover: 'group-hover:text-alpine-700',
  navLink: 'text-alpine-700 hover:bg-alpine-50 hover:text-alpine-900',
  featureIcon: 'bg-alpine-100 text-alpine-700',
  selectorGroup: 'bg-white shadow-md ring-1 ring-alpine-900/10',
  demoBorder: 'border-alpine-200/80',
  demoHeaderBorder: 'border-alpine-100',
  demoHeaderBg: 'bg-alpine-50/80',
  demoShadow: 'shadow-alpine-900/10 ring-alpine-900/5',
  demoTabActive: 'bg-alpine-800 text-white',
  demoTabIdle: 'bg-alpine-100 text-alpine-800 hover:bg-alpine-200',
  demoStatBg: 'bg-alpine-50',
};

const BOAT_THEME = {
  pageBg: 'bg-ocean-50',
  heroBorder: 'border-ocean-300',
  heroRadial:
    'bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(3,105,161,0.18),transparent)]',
  heroDots:
    'opacity-[0.35] [background-image:radial-gradient(rgba(7,89,133,0.14)_1px,transparent_1px)] [background-size:24px_24px]',
  accent: 'text-ocean-700',
  badge: 'border-ocean-200 bg-white/90 text-ocean-900',
  heroGlow: 'from-ocean-200/50 to-ocean-100/40',
  selectorLabel: 'text-ocean-950',
  selectorActive: 'border-transparent bg-ocean-800 text-white shadow-sm',
  selectorIdle:
    'border-transparent bg-white text-ocean-800 hover:bg-ocean-50',
  pricingSection:
    'border-ocean-950 bg-gradient-to-b from-ocean-950 via-ocean-900 to-ocean-900',
  pricingCard: 'border-ocean-700/50 bg-ocean-800/40',
  pricingHighlight: 'text-ocean-200',
  pricingBullet: 'bg-ocean-300',
  pricingTag: 'border-ocean-600 bg-ocean-800/80 text-ocean-100',
  pricingWhyBox: 'border-ocean-700/50 bg-ocean-950/50',
  featuresCard: 'border-ocean-200 bg-white hover:shadow-ocean-900/5',
  stepsSection: 'border-ocean-200 bg-gradient-to-b from-ocean-50 to-white',
  stepsLine: 'bg-ocean-200',
  stepCircle: 'bg-ocean-800',
  ctaBorder: 'border-ocean-600/40',
  ctaBg: 'bg-gradient-to-br from-ocean-950 via-ocean-900 to-ocean-800',
  ctaGlow: 'bg-[radial-gradient(circle_at_70%_0%,rgba(14,165,233,0.2),transparent_55%)]',
  primaryBtn: '!bg-ocean-800 !text-white hover:!bg-ocean-900',
  headerBorder: 'border-ocean-200/80',
  logoHover: 'group-hover:text-ocean-800',
  navLink: 'text-ocean-800 hover:bg-ocean-50 hover:text-ocean-950',
  featureIcon: 'bg-ocean-100 text-ocean-800',
  selectorGroup: 'bg-white shadow-md ring-1 ring-ocean-900/10',
  secondaryBtn: 'border-ocean-300 hover:bg-ocean-50',
  demoBorder: 'border-ocean-200/80',
  demoHeaderBorder: 'border-ocean-100',
  demoHeaderBg: 'bg-ocean-50/80',
  demoShadow: 'shadow-ocean-900/10 ring-ocean-900/5',
  demoTabActive: 'bg-ocean-800 text-white',
  demoTabIdle: 'bg-ocean-100 text-ocean-800 hover:bg-ocean-200',
  demoStatBg: 'bg-ocean-50',
};

export const MARKETING_SCENARIOS = {
  forest: {
    id: 'forest',
    label: 'Lakes & forest',
    emoji: '🌲',
    theme: FOREST_THEME,
    heroAction: 'before you make the drive up north',
    heroBody:
      '{appName} combines a shared listing workspace with pricing models trained on the {listingType} you save — in whatever towns and regions you define. You build the comp library; we help you see what\'s fair in your markets, not what a national portal guesses.',
    listingType: 'lake and forest',
    heroAccent: 'fairly priced',
    pricingLensRegion:
      'Compare within a region you set up — lake pricing shifts lot by lot, and your model learns from the listings you save there.',
    pricingInsight:
      'Vacation markets are thin. A big spread on a cabin might be normal — or a red flag — depending on frontage, road noise, and what else you\'ve saved nearby.',
    ctaHeadline: 'Start building your comp library',
    pricePickerBlurb: 'On a north woods search, compare Eagle River vs Minocqua while you sweep acres on a lake lot.',
    demo: {
      title: '4BR on Long Lake · Eagle River, WI',
      listPrice: '$425,000',
      defaultTab: 'region',
      featureHint: 'Uses acres, sqft, beds/baths, waterfront & lot type from your dataset',
      stats: [
        { label: 'Acres', value: '2.1' },
        { label: 'Sqft', value: '2,840' },
        { label: 'Waterfront', value: 'Yes' },
      ],
      tabs: [
        { id: 'all', label: 'All listings', count: 14 },
        { id: 'region', label: 'All in Eagle River', count: 9 },
        { id: 'similar', label: 'Similar listings', count: 6 },
      ],
      segments: {
        all: {
          expectedPrice: '$395,000',
          deltaLabel: 'About 7% above model · based on 14 saved listings',
          tone: 'above',
        },
        region: {
          expectedPrice: '$389,000',
          deltaLabel: 'About 9% above model · based on 9 homes in Eagle River',
          tone: 'above',
        },
        similar: {
          expectedPrice: '$378,000',
          deltaLabel: 'About 12% above model · based on 6 similar lake homes',
          tone: 'above',
        },
      },
    },
    features: [
      {
        icon: 'regions',
        title: 'Regions & lakes',
        description: 'Group whatever lake and forest areas you\'re considering — name your own regions and compare pros and cons side by side.',
      },
      {
        icon: 'listings',
        title: 'Listing tracker',
        description: 'Paste from Zillow, track price history, and filter vacant lots vs cabins on the water.',
      },
      {
        icon: 'drive',
        title: 'Drive times',
        description: 'Set your home location once — see how far each lake property is from where you live today.',
      },
      {
        icon: 'team',
        title: 'Shared searches',
        description: 'Invite your spouse or partner. One workspace, same facts, fewer “which lake was that?” moments.',
      },
      {
        icon: 'map',
        title: 'Maps & routes',
        description: 'Pin regions and listings with driving routes from your primary location.',
      },
      {
        icon: 'chart',
        title: 'Price history',
        description: 'Catch list-price drops on cabins you liked months ago but were not ready to tour.',
      },
    ],
    steps: [
      {
        step: '1',
        title: 'Create a search',
        description: 'Name your search, invite your partner, and add the locations you drive from.',
      },
      {
        step: '2',
        title: 'Build your dataset',
        description: 'Paste listings as you browse — lakefront lots, cabins, vacant land — models sharpen with every save.',
      },
      {
        step: '3',
        title: 'Compare with confidence',
        description: 'Use drive times, comments, and pricing models to narrow the list on your timeline.',
      },
    ],
    pricingFeatures: ['Acres & lot size', 'Living sqft & bed/bath', 'Vacant lot vs with home', 'Waterfront', 'Region'],
  },

  beach: {
    id: 'beach',
    label: 'Beach & coast',
    emoji: '🏖️',
    theme: BEACH_THEME,
    heroAction: 'before you tour the coast blind',
    heroBody:
      '{appName} combines a shared listing workspace with pricing models trained on the {listingType} you save — in whatever towns and regions you define. You build the comp library; we help you see what\'s fair in your markets, not what a national portal guesses.',
    listingType: 'coastal',
    heroAccent: 'fairly priced',
    pricingLensRegion:
      'Compare within a coastal area you define — gulf-front, bay-side, and off-beach often behave like different comp pools.',
    pricingInsight:
      'Coastal ask prices swing with elevation, flood zone, rental history, and distance from the water. A national estimate rarely captures the block-by-block reality in the markets you\'re tracking.',
    ctaHeadline: 'Start building your comp library',
    pricePickerBlurb: 'On a coastal search, see how gulf-view premiums and square footage stack up across Destin and 30A.',
    demo: {
      title: '3BR Gulf-view · Destin, FL',
      listPrice: '$875,000',
      defaultTab: 'region',
      featureHint: 'Uses sqft, beds/baths, waterfront & region from your saved coastal listings',
      stats: [
        { label: 'Sqft', value: '2,150' },
        { label: 'Beds', value: '3' },
        { label: 'To beach', value: '2 blocks' },
      ],
      tabs: [
        { id: 'all', label: 'All listings', count: 22 },
        { id: 'region', label: 'All in Destin', count: 11 },
        { id: 'similar', label: 'Similar listings', count: 7 },
      ],
      segments: {
        all: {
          expectedPrice: '$840,000',
          deltaLabel: 'About 4% above model · based on 22 saved listings',
          tone: 'above',
        },
        region: {
          expectedPrice: '$812,000',
          deltaLabel: 'About 8% above model · based on 11 homes in Destin',
          tone: 'above',
        },
        similar: {
          expectedPrice: '$868,000',
          deltaLabel: 'In line with model · based on 7 similar gulf-view homes',
          tone: 'inline',
        },
      },
    },
    features: [
      {
        icon: 'regions',
        title: 'Regions & towns',
        description: 'Organize by beach town or stretch of coast — run a separate search for each market you\'re comparing.',
      },
      {
        icon: 'listings',
        title: 'Listing tracker',
        description: 'Paste Zillow listings, track price history, and filter gulf-front vs off-beach.',
      },
      {
        icon: 'drive',
        title: 'Travel times',
        description: 'Set home and airport locations — see drive or commute context for every property you save.',
      },
      {
        icon: 'team',
        title: 'Shared searches',
        description: 'Invite your partner as owner, editor, or viewer. Comment on listings after every beach walk.',
      },
      {
        icon: 'map',
        title: 'Maps & routes',
        description: 'See every pin on one map — know exactly where a house sits relative to the water.',
      },
      {
        icon: 'chart',
        title: 'Price history',
        description: 'Watch shoulder-season price drops and know when a coastal listing is worth revisiting.',
      },
    ],
    steps: [
      {
        step: '1',
        title: 'Create a search',
        description: 'Start a workspace for each coastal market you\'re seriously considering.',
      },
      {
        step: '2',
        title: 'Build your dataset',
        description: 'Save gulf-front homes, bay-side options, and off-beach properties as you browse between visits.',
      },
      {
        step: '3',
        title: 'Compare with confidence',
        description: 'Use pricing models and notes to separate tourist-trap pricing from genuine value.',
      },
    ],
    pricingFeatures: ['Living sqft & bed/bath', 'Waterfront', 'Region', 'Year built', 'Lot size'],
  },

  ski: {
    id: 'ski',
    label: 'Ski town',
    emoji: '⛷️',
    theme: SKI_THEME,
    heroAction: 'before slopeside hype wins',
    heroBody:
      '{appName} combines a shared listing workspace with pricing models trained on the {listingType} you save — in whatever towns and regions you define. You build the comp library; we help you see what\'s fair in your markets, not what a national portal guesses.',
    listingType: 'ski-town',
    heroAccent: 'fairly priced',
    pricingLensRegion:
      'Compare within a resort area you define — ski-in/ski-out and valley-floor homes often price very differently.',
    pricingInsight:
      'Mountain towns price on lift proximity, rental restrictions, and elevation as much as square footage. Your comp library learns what premium is normal in the resort markets you track.',
    ctaHeadline: 'Start building your comp library',
    pricePickerBlurb: 'On a ski-town search, compare Breckenridge vs Keystone as house size and year built move the estimate.',
    demo: {
      title: '4BR Slopeside · Breckenridge, CO',
      listPrice: '$1,195,000',
      defaultTab: 'region',
      featureHint: 'Uses sqft, beds/baths, region & property type from your saved mountain listings',
      stats: [
        { label: 'Sqft', value: '2,620' },
        { label: 'Beds', value: '4' },
        { label: 'To lift', value: 'Walk' },
      ],
      tabs: [
        { id: 'all', label: 'All listings', count: 18 },
        { id: 'region', label: 'All in Breckenridge', count: 8 },
        { id: 'similar', label: 'Similar listings', count: 5 },
      ],
      segments: {
        all: {
          expectedPrice: '$1,150,000',
          deltaLabel: 'About 4% above model · based on 18 saved listings',
          tone: 'above',
        },
        region: {
          expectedPrice: '$1,080,000',
          deltaLabel: 'About 11% above model · based on 8 homes in Breckenridge',
          tone: 'above',
        },
        similar: {
          expectedPrice: '$1,210,000',
          deltaLabel: 'About 1% below model · based on 5 similar slopeside homes',
          tone: 'below',
        },
      },
    },
    features: [
      {
        icon: 'regions',
        title: 'Regions & resorts',
        description: 'Track each resort market you\'re considering as its own region — compare base villages and nearby towns on your terms.',
      },
      {
        icon: 'listings',
        title: 'Listing tracker',
        description: 'Paste listings, track price history, and filter ski-in/ski-out vs drive-to-lift properties.',
      },
      {
        icon: 'drive',
        title: 'Travel times',
        description: 'Set your home city and nearest airport — contextualize every property before you book flights.',
      },
      {
        icon: 'team',
        title: 'Shared searches',
        description: 'Share the hunt with your partner. Comment after open houses and après-ski walk-throughs.',
      },
      {
        icon: 'map',
        title: 'Maps & routes',
        description: 'Pin listings and see how far each home sits from lifts, town, and the highway.',
      },
      {
        icon: 'chart',
        title: 'Price history',
        description: 'Spot off-season price cuts on chalets you toured last winter but passed on.',
      },
    ],
    steps: [
      {
        step: '1',
        title: 'Create a search',
        description: 'One workspace per resort market — name it, invite your partner, add your home base.',
      },
      {
        step: '2',
        title: 'Build your dataset',
        description: 'Save slopeside condos and valley homes as you research between ski seasons.',
      },
      {
        step: '3',
        title: 'Compare with confidence',
        description: 'Let pricing models show when lift-proximity premiums are in line — or out of whack.',
      },
    ],
    pricingFeatures: ['Living sqft & bed/bath', 'Region', 'Year built', 'Waterfront', 'Vacant lot vs with home'],
  },

  boats: {
    id: 'boats',
    label: 'Boats',
    emoji: '⛵',
    isBoat: true,
    theme: BOAT_THEME,
    heroAction: 'before you commit to the next haul-out',
    heroBody:
      '{appName} gives boat shoppers the same shared workspace and pricing models as home searches — save sail and power listings, train comps on length and year, and decide what\'s fair in the markets you actually shop.',
    listingType: 'sail and power',
    heroAccent: 'fairly priced',
    pricingLensRegion:
      'Compare within a boat market you define — Great Lakes, Chesapeake, and coastal fleets often behave like separate comp pools.',
    pricingLensSimilarTitle: 'Similar boats',
    pricingLensSimilar:
      'A comp-style view matched on length, year, and propulsion from boats you have already saved.',
    pricingInsight:
      'Boat asking prices swing with length, age, gear, and local demand. A generic online estimate rarely matches the fleet you\'ve been watching all season.',
    ctaHeadline: 'Start building your boat comp library',
    pricePickerTitle: 'See how price moves — length, year, and market',
    pricePickerLead:
      'Price picker holds your dream boat steady while you slide length or year. With multiple markets selected, steeper lines mean that variable matters more there — the same foot of LOA can price differently on the Great Lakes vs the Chesapeake.',
    pricePickerBlurb: 'On a boat search, compare Great Lakes vs Chesapeake as length and year move the estimate.',
    demo: {
      title: '1998 Catalina 320 · Annapolis, MD',
      listPrice: '$84,900',
      defaultTab: 'region',
      featureHint: 'Uses length & year from your saved boat listings',
      stats: [
        { label: 'Length', value: '32 ft' },
        { label: 'Year', value: '1998' },
        { label: 'Type', value: 'Sail' },
      ],
      tabs: [
        { id: 'all', label: 'All boats', count: 16 },
        { id: 'region', label: 'Chesapeake fleet', count: 9 },
        { id: 'similar', label: 'Similar boats', count: 6 },
      ],
      segments: {
        all: {
          expectedPrice: '$79,500',
          deltaLabel: 'About 7% above model · based on 16 saved boats',
          tone: 'above',
        },
        region: {
          expectedPrice: '$76,000',
          deltaLabel: 'About 12% above model · based on 9 Chesapeake sailboats',
          tone: 'above',
        },
        similar: {
          expectedPrice: '$82,500',
          deltaLabel: 'In line with model · based on 6 similar 30–34 ft sailboats',
          tone: 'inline',
        },
      },
    },
    features: [
      {
        icon: 'listings',
        title: 'Boat tracker',
        description: 'Import from YachtWorld, track asking price, and keep make, model, length, and year in one place.',
      },
      {
        icon: 'chart',
        title: 'Pricing by length & year',
        description: 'Train simple models on the boats you save — ask whether a 32-footer is fairly priced for its age.',
      },
      {
        icon: 'team',
        title: 'Shared searches',
        description: 'Invite your partner. Comment after sea trials and keep one source of truth instead of text threads.',
      },
      {
        icon: 'drive',
        title: 'Broker travel context',
        description: 'Save home and marina locations — know how far you are traveling before you book a showing.',
      },
      {
        icon: 'map',
        title: 'Maps & pins',
        description: 'Pin boats that have a location so you can see the fleet on one map.',
      },
      {
        icon: 'chart',
        title: 'Price history',
        description: 'Catch asking-price drops on boats you loved last season but weren’t ready to buy.',
      },
    ],
    steps: [
      {
        step: '1',
        title: 'Create a boat search',
        description: 'Start a Boats workspace, invite your partner, and add the places you travel from.',
      },
      {
        step: '2',
        title: 'Build your fleet dataset',
        description: 'Import YachtWorld listings as you browse — sail and power — so models sharpen with every save.',
      },
      {
        step: '3',
        title: 'Compare with confidence',
        description: 'Use length/year pricing, notes, and price history to decide when to tour or walk away.',
      },
    ],
    pricingFeatures: ['Length (ft)', 'Year', 'Make & model', 'Sail vs motor', 'List price history'],
  },
};

export const SCENARIO_LIST = Object.values(MARKETING_SCENARIOS);

export function getStoredScenarioId() {
  try {
    const stored = sessionStorage.getItem('marketing-vacation-type');
    if (stored && MARKETING_SCENARIOS[stored]) return stored;
  } catch {
    // ignore
  }
  return DEFAULT_SCENARIO_ID;
}

export function storeScenarioId(id) {
  try {
    sessionStorage.setItem('marketing-vacation-type', id);
  } catch {
    // ignore
  }
}
