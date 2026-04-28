# 04 — Review Notes Template

Status: scaffolded; needs real reviewer account details before submission
Last updated: 2026-04-28

## App Review contact block

- First name: `[fill in]`
- Last name: `[fill in]`
- Phone number: `[fill in]`
- Email: `[fill in]`

## Demo account credentials

Do **not** fabricate this section. Fill with a real seeded account before submission.

- Demo account email: `[fill in]`
- Demo account password: `[fill in]`
- Subscription state to test: `[Free / Charter / Member]`
- If using multiple reviewer accounts, list them here:
  - `[account 2 if needed]`

## Reviewer access note

Suggested note:

`The app requires sign-in to view personalized content. Please use the demo credentials above. The demo account has completed onboarding and includes sample journal history so the personalized flows are visible immediately.`

## Step-by-step reviewer walkthrough

Use or adapt this for App Review Notes.

1. Launch the app and sign in with the demo account above.
2. On first load, the reviewer can access:
   - Home
   - Daily Reading
   - Natal Reading / chart surfaces
   - Companion journal flow
3. Open **Daily Reading** to see the app’s transit-aware daily guidance.
4. Open **Companion** to see the journaling interface and context-aware AI response flow.
5. Open **Natal Reading** to see the chart-based interpretation surfaces.
6. If the review account is subscribed, open **Transit Calendar** to see the paid calendar view.
7. If subscription testing is needed, open **Membership** / **Upgrade**.

## Short functional summary for App Review

Suggested note:

`SOS is a personalized astrology and journaling app. A user enters birth data once, receives chart-based readings, and can use an AI companion to reflect on journal entries. The app does not require astrology knowledge and is designed for reflective guidance, not medical or financial decision-making.`

## Content / safety notes

### Astrology content
Suggested note:

`SOS provides astrology-based reflective content. It is not medical, psychiatric, legal, or financial advice. The app is intended for personal reflection and daily guidance only.`

### AI usage
Suggested note:

`The app uses OpenAI models to generate onboarding reports, natal-reading text, and journal-companion responses based on user-provided input and chart/transit context.`

### Subscription model
Suggested note:

`The current web codebase supports account signup plus subscription-gated features. Calendar access and some chart-depth surfaces are gated by paid membership. Final App Store submission should only reflect the subscription products actually configured in App Store Connect.`

### Encryption / privacy claims
Suggested note:

`The team has recently completed work to support stronger protection for journal-derived data at rest. External claims about encryption and privacy should match the final production implementation and policy language exactly.`

## Common rejection risks for this app class and response notes

### 1. Misleading health / wellness claims
Risk:
- Astrology/wellness language can sound diagnostic or therapeutic if phrased carelessly.

How SOS should address it:
- Keep all copy in a reflective/guidance register.
- Avoid claims of treatment, diagnosis, prevention, cure, or guaranteed outcomes.
- Explicitly state the app is not medical, psychiatric, legal, or financial advice.

### 2. AI content that feels unsafe, overconfident, or deceptive
Risk:
- Reviewers may flag apps that present AI as authoritative or hidden.

How SOS should address it:
- Disclose that OpenAI is used.
- Keep outputs framed as reflective guidance.
- Avoid impersonation, false human claims, or fabricated expertise.
- Provide a consistent reviewer test path with predictable seeded content.

### 3. Subscription mismatch / unclear monetization
Risk:
- Metadata, paywall copy, and configured IAP products do not match.

How SOS should address it:
- Align App Store Connect products, in-app paywall copy, and review notes before submission.
- Remove any reference to web-only Stripe pricing structures that are not present in native IAP.
- Clarify what free users can access versus paid users.

### 4. Privacy disclosures not matching actual data flows
Risk:
- Journal text, birth data, and AI processing are not accurately disclosed.

How SOS should address it:
- Finalize privacy nutrition labels from the audited flows.
- Disclose OpenAI, Stripe, geocoding, auth, and logging behavior in the privacy policy.
- Ensure App Store privacy answers and policy language say the same thing.

### 5. Reviewer cannot access gated or personalized content
Risk:
- No seeded account, broken onboarding, or empty state prevents review.

How SOS should address it:
- Provide a fully prepared seeded review account.
- Include enough content history to demonstrate the journal flow.
- If a subscription is required to view a key surface, ensure the review account has the right entitlement.

### 6. Unsupported payment flow in native submission
Risk:
- A native iOS build submits with web Stripe checkout for digital access.

How SOS should address it:
- For App Store submission, move digital subscriptions to App Store IAP / StoreKit flow.
- Do not submit a native app that uses web Stripe to unlock in-app digital content unless legal/review guidance clearly permits a specific exception.

## Reviewer checklist before final submission

- [ ] Real demo credentials inserted
- [ ] Review contact inserted
- [ ] Subscription products in App Store Connect match in-app copy
- [ ] Privacy policy URL exists and is live
- [ ] Support URL exists and is live
- [ ] Any encryption/security claim matches final production implementation exactly
- [ ] No founder/personal identity references appear in metadata, screenshots, or notes
- [ ] If app is shipped as native iOS, reviewer path is tested inside the actual submission build
