import { Link } from 'react-router-dom';
import MarketingContentPage, { ContentList, ContentSection } from '../components/MarketingContentPage';
import { APP_NAME, CONTACT_EMAIL } from '../lib/brand';

export default function About() {
  return (
    <MarketingContentPage
      title="About us"
      intro={`${APP_NAME} started as a practical tool for a real vacation-home search — the kind that takes months or years of browsing listings, debating regions, and trying to remember which lake had the better price. It now covers boats the same way: shared research, comps, and pricing you train yourself.`}
      lastUpdated={null}
    >
      <ContentSection title="What we built">
        <p>
          Most property portals tell you what <em>they</em> think a home is worth. We built
          something different: a private workspace where you and your partner (or family) save
          vacation homes <em>or</em> boats, compare options, track price history, and train simple
          pricing models on <strong>your</strong> research — so you can ask &ldquo;is this fairly
          priced?&rdquo; against your own comp library, not a black box.
        </p>
        <p>
          For homes: drive times, lakes and regions, comments after showings. For boats: YachtWorld
          import, length and year pricing, and the same shared notes after sea trials — organized the
          way you actually think about the hunt.
        </p>
      </ContentSection>

      <ContentSection title="Who it's for">
        <ContentList
          items={[
            'Couples or families researching a second home — or a sail/power boat — over a long timeline.',
            'Lake, beach, ski, or boat markets where local comps matter more than national estimates.',
            'People who want one shared source of truth — not a spreadsheet and a group chat.',
          ]}
        />
      </ContentSection>

      <ContentSection title="What we're not">
        <ContentList
          items={[
            'A real estate brokerage, yacht brokerage, or MLS.',
            'A substitute for an appraiser, surveyor, attorney, or financial advisor.',
            'Affiliated with Zillow, YachtWorld, or other listing sites — you paste or import links; we help you organize what you find.',
            'A huge company with a call center. We\'re a focused product; support is direct and human-scaled.',
          ]}
        />
      </ContentSection>

      <ContentSection title="Get started">
        <p>
          Create a free account, start a search, and invite your collaborator. There is no rush —
          the app is designed for searches that unfold over seasons, not weekends.
        </p>
        <p>
          <Link to="/register" className="font-medium text-pine-800 hover:text-pine-950">
            Create an account →
          </Link>
        </p>
      </ContentSection>
    </MarketingContentPage>
  );
}
