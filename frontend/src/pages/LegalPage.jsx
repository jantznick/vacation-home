import { Link } from 'react-router-dom';
import MarketingContentPage, { ContentList, ContentSection } from '../components/MarketingContentPage';
import { APP_DOMAIN, APP_NAME, CONTACT_EMAIL } from '../lib/brand';

export function Privacy() {
  return (
    <MarketingContentPage
      title="Privacy policy"
      intro={`${APP_NAME} is a small, focused product for researching vacation homes and boats. This policy explains what we collect, why, and your choices.`}
    >
      <ContentSection title="Who we are">
        <p>
          {APP_NAME} ({APP_DOMAIN}) provides a shared workspace for tracking vacation-home and boat
          listings, regions, and pricing research. We are not a brokerage, lender, or
          financial advisor.
        </p>
      </ContentSection>

      <ContentSection title="Information we collect">
        <ContentList
          items={[
            'Account information you provide at registration — typically your name and email address.',
            'Search workspace data you and your collaborators add: regions, listings, notes, comments, pricing models, and related research.',
            'Location data you choose to save (e.g. points of interest for drive-time calculations).',
            'Technical data such as session cookies needed to keep you signed in, and standard server logs (IP address, browser type, timestamps) for security and troubleshooting.',
          ]}
        />
      </ContentSection>

      <ContentSection title="How we use your information">
        <ContentList
          items={[
            'Provide and operate the service — authentication, saved searches, collaboration, and features you request.',
            'Send transactional email when configured (e.g. search invites).',
            'Improve reliability, fix bugs, and protect against abuse.',
            'Respond when you contact us.',
          ]}
        />
        <p>We do not sell your personal information. We do not use your listing research for advertising.</p>
      </ContentSection>

      <ContentSection title="Third-party services">
        <p>Depending on how you use the product, data may be processed by:</p>
        <ContentList
          items={[
            'Hosting and database providers that run the application.',
            'Google Maps Platform — when you use geocoding, drive times, or map features (addresses and coordinates you save are sent to Google per their terms).',
            'Resend or similar email providers — when workspace invites are sent.',
            'Listing sources you paste or import manually (e.g. Zillow or YachtWorld URLs). We are not affiliated with those sites; their data is subject to their policies.',
          ]}
        />
      </ContentSection>

      <ContentSection title="Data retention">
        <p>
          We keep your account and search data while your account is active. If you ask us to
          delete your account, we will remove or anonymize your personal data within a reasonable
          timeframe, except where we must retain information for legal or security reasons.
        </p>
      </ContentSection>

      <ContentSection title="Your choices">
        <ContentList
          items={[
            'Access and update profile information in the app.',
            'Export or copy your research data from within your searches.',
            'Request account deletion by emailing us (see Contact).',
            'Decline optional cookies by not using the service — session cookies are required to stay logged in.',
          ]}
        />
      </ContentSection>

      <ContentSection title="Security">
        <p>
          We use industry-standard practices appropriate for a small SaaS product — encrypted
          connections (HTTPS), hashed passwords, and access controls on workspace data. No
          system is perfectly secure; use a strong, unique password and only invite people you
          trust to a search.
        </p>
      </ContentSection>

      <ContentSection title="Children">
        <p>
          The service is intended for adults researching property purchases. We do not knowingly
          collect information from children under 13.
        </p>
      </ContentSection>

      <ContentSection title="Changes">
        <p>
          We may update this policy as the product evolves. We will post the revised date at
          the top of this page. Continued use after changes means you accept the updated policy.
        </p>
      </ContentSection>

      <ContentSection title="Contact">
        <p>
          Privacy questions or deletion requests:{' '}
          <a href={`mailto:${CONTACT_EMAIL}`} className="font-medium text-pine-800 hover:text-pine-950">
            {CONTACT_EMAIL}
          </a>
          . You can also reach us through the{' '}
          <Link to="/contact" className="font-medium text-pine-800 hover:text-pine-950">
            contact page
          </Link>
          .
        </p>
      </ContentSection>
    </MarketingContentPage>
  );
}

export function Terms() {
  return (
    <MarketingContentPage
      title="Terms of service"
      intro={`By creating an account or using ${APP_NAME}, you agree to these terms. Please read them — they are written to be straightforward, not to hide surprises.`}
    >
      <ContentSection title="The service">
        <p>
          {APP_NAME} helps you and your collaborators research vacation homes and boats: save listings,
          organize home regions (when relevant), track price history, estimate value from your own comp library, and
          related tools. We may add, change, or remove features over time.
        </p>
      </ContentSection>

      <ContentSection title="Accounts">
        <ContentList
          items={[
            'You must provide accurate registration information and keep your credentials secure.',
            'You are responsible for activity under your account.',
            'You must be at least 18 years old (or the age of majority where you live) to use the service.',
            'We may suspend or terminate accounts that violate these terms or pose a security risk.',
          ]}
        />
      </ContentSection>

      <ContentSection title="Your content & searches">
        <ContentList
          items={[
            'You retain ownership of the listing notes, comments, and research you add.',
            'You grant us a limited license to host, back up, and display that content so the service works for you and your invited collaborators.',
            'Search owners control who has access (owners, editors, viewers). Only invite people you trust.',
            'You are responsible for ensuring you have the right to store and share any data you upload or paste into the app.',
          ]}
        />
      </ContentSection>

      <ContentSection title="Acceptable use">
        <p>You agree not to:</p>
        <ContentList
          items={[
            'Use the service for unlawful purposes or to harass others.',
            'Attempt to access another user\'s searches without authorization.',
            'Scrape, overload, or reverse-engineer the service in ways that harm availability.',
            'Misrepresent pricing estimates or app output as professional appraisal, legal, or financial advice.',
          ]}
        />
      </ContentSection>

      <ContentSection title="Pricing estimates & third-party data">
        <p>
          Pricing models and deal labels are statistical estimates based on listings{' '}
          <strong>you</strong> save. They are research tools only — not appraisals, not
          Zestimates, and not a guarantee of market value or investment performance. Listing
          details pasted or imported from third-party sites (including Zillow and YachtWorld) remain subject to those sites&apos;
          terms; we are not affiliated with them.
        </p>
      </ContentSection>

      <ContentSection title="Disclaimer of warranties">
        <p>
          The service is provided &ldquo;as is&rdquo; and &ldquo;as available.&rdquo; We do our
          best to keep it reliable, but we do not warrant uninterrupted or error-free operation,
          or that estimates will be accurate for any particular property.
        </p>
      </ContentSection>

      <ContentSection title="Limitation of liability">
        <p>
          To the fullest extent permitted by law, {APP_NAME} and its operators will not be
          liable for indirect, incidental, or consequential damages arising from your use of the
          service — including decisions you make about buying or passing on a property. Our
          total liability for any claim related to the service is limited to the amount you paid
          us in the twelve months before the claim (or $100 if you use a free plan).
        </p>
      </ContentSection>

      <ContentSection title="Termination">
        <p>
          You may stop using the service at any time. We may discontinue the service or your
          access with reasonable notice when possible. Sections that by nature should survive
          (disclaimers, liability limits, your content license while data is retained) will
          survive termination.
        </p>
      </ContentSection>

      <ContentSection title="Changes to these terms">
        <p>
          We may update these terms. The &ldquo;Last updated&rdquo; date at the top will change.
          Material changes may be noted in the app or by email when practical. Continued use
          after updates constitutes acceptance.
        </p>
      </ContentSection>

      <ContentSection title="Contact">
        <p>
          Questions about these terms:{' '}
          <a href={`mailto:${CONTACT_EMAIL}`} className="font-medium text-pine-800 hover:text-pine-950">
            {CONTACT_EMAIL}
          </a>
          . See also our{' '}
          <Link to="/privacy" className="font-medium text-pine-800 hover:text-pine-950">
            privacy policy
          </Link>
          .
        </p>
      </ContentSection>
    </MarketingContentPage>
  );
}
