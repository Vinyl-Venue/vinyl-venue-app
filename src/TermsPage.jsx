import { LegalLayout, Section } from './LegalLayout'

function TermsPage() {
  return (
    <LegalLayout title="Terms of Service" updated="[date]">
      <Section title="1. About Vinyl Venue">
        <p>
          Vinyl Venue ("we", "us") is a platform where collectors catalog their record collections, follow one
          another, and list records for sale, auction or trade. These terms govern your use of the site. By creating
          an account or using Vinyl Venue you agree to them. [Legal entity name and address.]
        </p>
      </Section>
      <Section title="2. Your account">
        <p>You must be at least 18 years old (or the age of majority where you live) to create an account.</p>
        <p>
          Give accurate information, keep your password secure, and tell us if you think your account has been
          accessed without permission. You are responsible for activity on your account.
        </p>
      </Section>
      <Section title="3. Your content">
        <p>
          You keep ownership of what you post, including your collection data, photos, listings, reviews and
          messages. You give us a licence to store, display and distribute that content as needed to run the service,
          for example showing your shelf to people who follow you and showing your listings in the marketplace.
        </p>
        <p>
          Only post content you have the right to share. Do not post anything unlawful, infringing, harassing or
          misleading.
        </p>
      </Section>
      <Section title="4. Buying, selling, bidding and trading">
        <p>
          Vinyl Venue provides the place where collectors find each other. Sales, auctions and trades are between the
          users involved. Unless we state otherwise, we are not a party to those transactions and do not inspect,
          grade or guarantee the records. [Describe payment handling once payments are enabled.]
        </p>
        <p>
          Listings, bids and offers are commitments. The Marketplace rules explain how listings, auctions and
          reviews work and form part of these terms.
        </p>
      </Section>
      <Section title="5. Conduct">
        <p>Do not use the service to defraud others, manipulate bids or reviews, harass people, scrape data in bulk,
          interfere with the service, or break the law.</p>
        <p>We may remove content, cancel listings, or suspend or close accounts that break these terms or put other
          users at risk.</p>
      </Section>
      <Section title="6. Disclaimers and liability">
        <p>
          The service is provided "as is" and "as available". To the fullest extent the law allows, we are not
          liable for indirect or consequential losses, or for disputes between users. [Liability cap and governing
          law to be confirmed with counsel.]
        </p>
      </Section>
      <Section title="7. Changes and ending your account">
        <p>We may update these terms; if the changes are significant we will tell you. You can stop using Vinyl Venue
          or ask us to delete your account at any time. [Contact email.]</p>
      </Section>
      <Section title="8. Contact">
        <p>Questions about these terms: [contact email].</p>
      </Section>
    </LegalLayout>
  )
}

export default TermsPage