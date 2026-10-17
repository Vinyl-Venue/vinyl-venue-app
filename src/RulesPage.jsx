import { LegalLayout, Section } from './LegalLayout'

function RulesPage() {
  return (
    <LegalLayout title="Marketplace Rules" updated="[date]">
      <Section title="Listing honestly">
        <p>Describe records accurately: title, pressing details and condition for both sleeve and media. Use your own
          photos where you can. Disclose flaws such as seam splits, scuffs, warps or skips.</p>
        <p>Only list records you own and can ship. Do not list counterfeit or unauthorised copies, or misrepresent a
          reissue or bootleg as an original pressing.</p>
      </Section>
      <Section title="Auctions">
        <p>A bid is a commitment to buy if you win. You cannot bid on your own listing.</p>
        <p>
          Each new bid must beat the current highest bid by a minimum amount: $0.50 under $25, $1 from $25, $2.50
          from $100, $5 from $250 and $10 from $500.
        </p>
        <p>
          A bid placed in the last 5 minutes extends the auction so it ends 5 minutes after that bid. This can repeat.
        </p>
      </Section>
      <Section title="Fixed-price sales and trades">
        <p>Sellers should ship promptly and package records safely. Trade offers can include records from your own
          shelf; if a trade is accepted, both sides are expected to complete it.</p>
      </Section>
      <Section title="Reviews">
        <p>Reviews should be honest and based on your own transaction. Do not offer or ask for payment, trades or
          favours in exchange for reviews, and do not post reviews about yourself or someone you are affiliated
          with.</p>
      </Section>
      <Section title="Disputes">
        <p>If something goes wrong, contact the other person first through Messages. If you cannot resolve it,
          contact us at [contact email]. [Describe the dispute and refund process once payments are enabled.]</p>
      </Section>
      <Section title="Enforcement">
        <p>We may remove listings, cancel auctions, restrict accounts or close accounts for breaking these rules or
          the Terms of Service.</p>
      </Section>
    </LegalLayout>
  )
}

export default RulesPage