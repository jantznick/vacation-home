import MarketingContentPage, { ContentList, ContentSection } from '../components/MarketingContentPage';
import { APP_NAME, CONTACT_EMAIL } from '../lib/brand';

export default function Contact() {
  return (
    <MarketingContentPage
      title="Contact"
      intro={`We're a small team behind ${APP_NAME}. The best way to reach us is email — we read everything and usually reply within a few business days.`}
      lastUpdated={null}
    >
      <ContentSection title="Email">
        <p>
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="text-lg font-medium text-pine-800 hover:text-pine-950"
          >
            {CONTACT_EMAIL}
          </a>
        </p>
      </ContentSection>

      <ContentSection title="What to include">
        <p>Help us help you faster:</p>
        <ContentList
          items={[
            'The email address on your account (if you have one).',
            'A short description of the issue or question.',
            'Screenshots if something looks broken.',
            'For invite or access problems: the search name and who invited you.',
          ]}
        />
      </ContentSection>

      <ContentSection title="Common topics">
        <ContentList
          items={[
            'Account access, password reset, or registration issues.',
            'Search invites and collaborator permissions.',
            'Bug reports or feature suggestions.',
            'Privacy requests (data export or account deletion) — see also our privacy policy.',
            'Press or partnership inquiries.',
          ]}
        />
      </ContentSection>

      <ContentSection title="Before you write">
        <p>
          Pricing estimates in the app are research tools, not professional advice. We cannot
          tell you whether to buy a specific property. For legal or financial questions, please
          consult a licensed professional in your area.
        </p>
        <p>
          We do not offer phone support at this time. Email keeps a clear record for both of us
          and works well for a product at our scale.
        </p>
      </ContentSection>
    </MarketingContentPage>
  );
}
