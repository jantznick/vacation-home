import { Link } from 'react-router-dom';
import MarketingContentPage, { ContentList, ContentSection } from '../components/MarketingContentPage';
import { APP_NAME, CONTACT_EMAIL } from '../lib/brand';

export default function About() {
  return (
    <MarketingContentPage
      title="About us"
      intro={`${APP_NAME} started as a practical tool for a real vacation-home search — the kind that takes months or years of browsing listings, debating regions, and trying to remember which lake had the better price.`}
      lastUpdated={null}
    >
      <ContentSection title="What we built">
        <p>
          Most property portals tell you what <em>they</em> think a home is worth. We built
          something different: a private workspace where you and your partner (or family) save
          listings, compare regions, track price history, and train simple pricing models on{' '}
          <strong>your</strong> research — so you can ask &ldquo;is this fairly priced?&rdquo;
          against your own comp library, not a black box.
        </p>
        <p>
          That means drive times to places you care about, comments after showings, lakes and
          regions organized the way you actually think about the hunt — and pricing segments for
          all listings, same region, or similar homes.
        </p>
      </ContentSection>

      <ContentSection title="Who it's for">
        <ContentList
          items={[
            'Couples or families researching a second home over a long timeline.',
            'Lake, beach, ski, or other vacation markets where local comps matter more than national estimates.',
            'People who want one shared source of truth — not a spreadsheet and a group chat.',
          ]}
        />
      </ContentSection>

      <ContentSection title="What we're not">
        <ContentList
          items={[
            'A real estate brokerage or MLS.',
            'A substitute for an appraiser, attorney, or financial advisor.',
            'Affiliated with Zillow or other listing sites — you paste links; we help you organize what you find.',
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
