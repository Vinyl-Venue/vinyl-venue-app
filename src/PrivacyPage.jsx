import { LegalLayout, Section } from './LegalLayout'

function PrivacyPage() {
  return (
    <LegalLayout title="Privacy Policy" updated="[date]">
      <Section title="What we collect">
        <p>
          <strong className="text-text">Account details:</strong> your email address, display name, avatar and bio.
        </p>
        <p>
          <strong className="text-text">What you add:</strong> your records and wishlist, listings, bids, orders and
          trade offers, reviews, board posts, messages, and which record you are currently spinning.
        </p>
        <p>
          <strong className="text-text">Activity we generate:</strong> notifications, and your digest preferences.
        </p>
        <p>
          Your browser also keeps a few small settings (for example whether you dismissed the welcome checklist) in
          local storage on your device.
        </p>
      </Section>
      <Section title="Who can see it">
        <p>Your profile is visible to other signed-in users. Your shelf is visible to you and to people who follow
          you. Your active listings are visible in the marketplace. Reviews you give or receive are visible to
          signed-in users. Messages are visible only to the people in the conversation.</p>
        <p>People you follow see your public activity, such as new records, listings and recommendations, in their
          activity feed and digest.</p>
      </Section>
      <Section title="How we use it">
        <p>To run the service: show your collection and listings, process bids and orders, send notifications,
          prevent abuse, and improve the product. We do not sell your personal information. [Confirm before adding
          advertising or analytics.]</p>
      </Section>
      <Section title="Who we share it with">
        <p>
          We use service providers to operate Vinyl Venue: Supabase (database and sign-in) and Vercel (hosting).
          [Add payment and email providers when they are enabled.] We may disclose information if the law requires
          it or to protect users and the service.
        </p>
      </Section>
      <Section title="Your choices">
        <p>You can edit or delete your records, listings and profile details at any time. You can ask us to delete
          your account and associated data, or for a copy of your data, by contacting [contact email]. You can turn
          the Crate Digest off on its page.</p>
      </Section>
      <Section title="Security and retention">
        <p>We use access controls and encrypted connections to protect your data. We keep data while your account
          is open and for a limited time afterwards where needed for records such as completed orders. [Confirm
          retention periods.]</p>
      </Section>
      <Section title="Children">
        <p>Vinyl Venue is for adults and is not directed to children under 18.</p>
      </Section>
      <Section title="Changes and contact">
        <p>We will update this page when our practices change. Questions: [contact email].</p>
      </Section>
    </LegalLayout>
  )
}

export default PrivacyPage