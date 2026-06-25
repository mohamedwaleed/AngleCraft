# Feature Specification: AngleCraft MVP — Ad Angle Generation & Testing Sprint

**Feature Branch**: `001-ad-angle-mvp`

**Created**: 2026-06-24

**Status**: Draft

**Input**: User description: "Build the MVP for AngleCraft. Features: (1) read user input (product link from Amazon, Shopify, or any website, OR a product photo); (2) generate ad angles (convenience, time saving, pain point, healthy lifestyle, perfect gift), each ad angle with 1 strong hook; (3) generate 1 ad concept for every ad angle; (4) generate ad creative — primary text and headline — for each ad concept; (5) integrate with Stripe for one-time payment after ad angle generation; (6) generate recommendations for testing and craft a detailed testing plan for the user; (7) generate results based on the user session (no auth or login)."

## Clarifications

### Session 2026-06-24

- Q: After payment, does the user see a loading/status flow for generating concepts, creatives, and the testing plan, or do results appear instantly? → A: Show a second status flow with labeled steps ("Generating concepts", "Generating creatives", "Building testing plan") mirroring the pre-payment pipeline.
- Q: How long should an anonymous session and its generated results remain accessible? → A: 7 days from session creation.
- Q: How much product context should URL extraction capture — text only, text + main image, or full extraction with images and reviews? → A: Text + main product image (name, description, price, bullet points/features, plus the primary product image).
- Q: Which ad platform(s) should the testing plan be written for? → A: Meta (Facebook/Instagram) and TikTok.
- Q: What download/export format should be offered for the results, and are creatives also downloadable? → A: A single formatted PDF containing all artifacts (Buyer Insights, angles, hooks, selected concepts, creatives, testing plan), plus individual copy-to-clipboard for quick use.
- Q: Align spec to the screenshot goal: 3 ad creatives, Buyer Insights, and full campaign with image + copy + CTA? → A: Yes. Keep 5 ad angles + hooks + Buyer Insights in free preview; AI selects top 3 angles; full campaign generates 3 ready-to-run creatives (image + primary text + headline + CTA) plus testing plan.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Capture Product Input (Priority: P1)

A marketer or e-commerce seller arrives at AngleCraft with a product they want
to advertise. They either paste a product URL (from Amazon, Shopify, or any
public product page) OR upload a product photo from their device. The system
accepts the input and moves the user to a dedicated status page that walks them
through the processing pipeline in real time, showing three sequential steps:

1. **Extracting product information** — pulling raw details from the URL or
   photo.
2. **Analyzing product** — interpreting the extracted details into structured
   product context (category, benefits, audience signals, buyer persona).
3. **Generating ad angles** — producing the five ad angles and hooks.

A persistent user-facing stepper at the top of both the status and preview pages
shows the three high-level milestones of the MVP flow: **Submit Product**, **Get
Ad Angles**, and **Get Your Ads**. The internal pipeline steps map to the middle
milestone (Get Ad Angles). When all three pipeline steps complete, the user is
taken to the ad-angle preview. The preview shows the five ad angles with hooks
plus a free Buyer Insights section summarizing the target buyer's profile,
desires, pain points, triggers, and objections. No account creation or login is
required — the session is anonymous and tied to the browser session.

**Why this priority**: Without a captured product input there is nothing to
generate. This is the entry point to the entire value chain and is independently
valuable as a "did we understand the product?" confirmation step. The visible
status pipeline also sets expectations and builds trust during processing.

**Independent Test**: Can be fully tested by submitting a URL and a photo and
confirming the system navigates to the status page, advances through the three
labeled steps in order, and arrives at the ad-angle preview showing five ad
angles with hooks plus a Buyer Insights section.

**Acceptance Scenarios**:

1. **Given** a new anonymous session, **When** the user pastes a valid Amazon
   product URL and submits, **Then** the system navigates to the status page
   and begins the "Extracting product information" step.
2. **Given** a new anonymous session, **When** the user uploads a clear product
   photo (JPG/PNG) and submits, **Then** the system navigates to the status
   page and begins the "Extracting product information" step.
3. **Given** the status page is showing, **When** each step completes, **Then**
   the system marks that step complete and advances the in-progress marker to
   the next step ("Analyzing product", then "Generating ad angles").
4. **Given** all three status steps have completed, **When** the final step
   finishes, **Then** the system navigates the user to the ad-angle preview
   showing the five angles with hooks and a Buyer Insights section.
5. **Given** the ad-angle preview, **When** the user reads the Buyer Insights
   section, **Then** it includes the buyer profile, main desire, pain points,
   buying triggers, and objections derived from the product context.
5. **Given** a user has submitted input, **When** the same browser session
   returns, **Then** the system recognizes the session and retains the
   previously submitted product context without requiring re-entry.
6. **Given** an invalid or unreachable URL, **When** the user submits it,
   **Then** the system shows a user-friendly error explaining the URL could not
   be read and invites retry.
7. **Given** a step fails mid-pipeline (e.g., extraction or analysis error),
   **When** the user is on the status page, **Then** the failing step is marked
   as failed with a retry option that re-attempts from the failed step without
   losing prior progress.

---

### User Story 2 - Generate Ad Angles & Hooks (Priority: P1)

As the final step of the status pipeline (User Story 1), the system generates
five distinct ad angles — convenience, time saving, pain point, healthy
lifestyle, and perfect gift. Each ad angle is paired with exactly one strong
hook (a single attention-grabbing opening line). When the "Generating ad angles"
step completes, the user is navigated to the ad-angle preview showing the five
angles with their hooks in a professional, full-width card grid. The preview
also displays the user-facing stepper with the current milestone on **Get Ad
Angles** and the upcoming **Get Your Ads** milestone. The system also internally
scores the angles so the top three can be automatically selected for the paid
full-campaign creatives.

**Why this priority**: The ad angles and hooks are the core creative output and
the primary reason users come to AngleCraft. They are also the gating artifact
before payment, making them critical to the business model.

**Independent Test**: Can be fully tested by submitting a product, watching the
status pipeline complete, and verifying that exactly five labeled ad angles are
produced on the preview page, each with one hook, matching the five required
categories.

**Acceptance Scenarios**:

1. **Given** the "Analyzing product" step has completed, **When** the system
   begins "Generating ad angles", **Then** it produces exactly five ad angles
   labeled convenience, time saving, pain point, healthy lifestyle, and perfect
   gift.
2. **Given** the five generated ad angles, **When** they are displayed on the
   preview page, **Then** each angle is accompanied by exactly one strong hook.
3. **Given** a product with limited context (e.g., a photo only), **When**
   angles are generated, **Then** the system still produces five angles
   appropriate to whatever context was available.
4. **Given** the "Generating ad angles" step completes, **When** the user
   arrives at the preview, **Then** the five angles and hooks are visible in a
   responsive card grid with a "Regenerate Angles" action, and the Buyer
   Insights section is displayed as a styled research panel below the angles.
5. **Given** the five generated ad angles, **When** the system scores them,
   **Then** the top three angles are marked for the paid full-campaign
   creatives.

---

### User Story 3 - Pay to Unlock Full Output (Priority: P1)

After viewing the five ad angles with hooks and the Buyer Insights section,
the user is prompted to make a one-time payment via Stripe to unlock the full
Campaign: three ready-to-run ad creatives, each based on one of the top three
AI-selected ad angles. Each full creative includes a generated ad image, a
headline, primary text, and a call-to-action. The deliverable also includes a
testing plan. The user completes checkout on Stripe and returns to their session,
where the system navigates them to a second status flow with three labeled steps
— "Generating concepts", "Generating creatives", and "Building testing plan" —
mirroring the pre-payment pipeline. When all three steps complete, the full
unlocked outputs are displayed.

**Why this priority**: Payment gates the rest of the value and validates the
business model. Without it the MVP cannot generate revenue.

**Independent Test**: Can be fully tested by reaching the paywall, completing a
Stripe checkout (test mode), and confirming the post-payment status flow
advances through its three steps and arrives at the full unlocked outputs in the
same session.

**Acceptance Scenarios**:

1. **Given** the five ad angles with hooks and Buyer Insights have been
   generated, **When** the user views the results, **Then** the three ready-to-run
   ad creatives and the testing plan are clearly marked as locked behind a
   one-time payment.
2. **Given** the locked state, **When** the user clicks pay and completes
   Stripe checkout, **Then** the system records the successful payment against
   the session and navigates to the post-payment status flow.
3. **Given** a completed payment, **When** the user returns to the session,
   **Then** the system shows the post-payment status flow advancing through
   "Generating concepts", "Generating creatives", and "Building testing plan".
4. **Given** all three post-payment status steps complete, **When** the final
   step finishes, **Then** the system displays the three ready-to-run ad
   creatives (image + copy + CTA each) and the testing plan, organized by the
   AI-selected ad angle, without requiring re-payment.
5. **Given** a failed or cancelled checkout, **When** the user returns,
   **Then** the outputs remain locked and the user is invited to retry
   payment.

---

### User Story 4 - Generate Ad Concepts & Creatives (Priority: P2)

Once payment is confirmed, the system navigates the user to the post-payment
status flow. The "Generating concepts" step selects the top three ad angles and
produces one ad concept for each selected angle. The "Generating creatives" step
produces a ready-to-run ad creative for each selected concept, consisting of a
generated ad image, a headline, primary text, and a call-to-action. All three
final ad creatives are presented organized by the selected ad angle once the
status flow completes.

**Why this priority**: This is the substantive creative deliverable users paid
for. It is P2 rather than P1 because it depends on payment (US-3) being
complete, but it is the core paid value.

**Independent Test**: Can be fully tested by completing payment and verifying
that exactly three ad creatives are produced, each tied to one of the top three
AI-selected ad angles, each with a generated image, headline, primary text, and
call-to-action.

**Acceptance Scenarios**:

1. **Given** a paid session with five ad angles, **When** the user views the
   unlocked output, **Then** exactly three ad creatives are displayed, each tied
   to one of the top three AI-selected ad angles.
2. **Given** the displayed creatives, **When** the user reads each creative,
   **Then** it includes a generated ad image, a headline, primary text, and a
   call-to-action clearly labeled.
3. **Given** the generated creatives, **When** the user wants to use them,
   **Then** each headline, primary text, and call-to-action can be copied to
   the clipboard individually.
4. **Given** a creative tied to the "pain point" angle, **When** the user reads
   it, **Then** the creative content and image reflect the pain point framing
   of that angle.
5. **Given** the full unlocked outputs, **When** the user wants to keep or
   share everything, **Then** they can download a single formatted PDF
   containing Buyer Insights, all angles, hooks, the three selected concepts,
   the three creatives, and the testing plan.

---

### User Story 5 - Generate Testing Plan & Recommendations (Priority: P2)

As the final step of the post-payment status flow ("Building testing plan"),
the system produces a testing plan: a structured recommendation for how the
user should test the five ad angles against each other, with extra emphasis on
the three AI-selected angles used for the ready-to-run creatives. The plan
includes suggested budget allocation, audience guidance, testing duration, and
which metrics to watch. The plan is presented alongside the creatives once the
status flow completes so the user leaves with both the ads and a path to
validate them.

**Why this priority**: The testing plan differentiates AngleCraft from a plain
copy generator and delivers the "creative strategist" promise. It is P2 because
it follows the paid creatives but is essential to the MVP value proposition.

**Independent Test**: Can be fully tested by completing payment and verifying a
structured testing plan is produced that references the five generated angles
and gives actionable testing guidance.

**Acceptance Scenarios**:

1. **Given** a paid session with generated creatives, **When** the user views
   the testing plan section, **Then** a structured plan is displayed covering
   budget allocation, audience guidance, testing duration, and key metrics.
2. **Given** the testing plan, **When** the user reads it, **Then** the plan
   references all five generated ad angles and explains how to compare them,
   with extra emphasis on the three AI-selected angles used for the creatives.
3. **Given** the testing plan, **When** the user wants to keep it, **Then** the
   plan can be copied to the clipboard individually or downloaded as part of
   the full PDF (see User Story 4).
4. **Given** a user with no testing experience, **When** they read the plan,
   **Then** the guidance is understandable without prior media-buying
   knowledge.

---

### Edge Cases

- What happens when the submitted URL points to a page that is not a product
  page (e.g., a homepage or article)? The system should detect this and ask the
  user to provide a product link or photo instead.
- What happens when the uploaded photo is blurry, contains no recognizable
  product, or is an unsupported format? The system should return a friendly
  error and invite retry.
- What happens when the product context is too sparse to differentiate all five
  angles or derive Buyer Insights? The system should still produce five angles
  and a Buyer Insights section, generalizing where needed, and note where context
  was limited.
- What happens when generation fails mid-way (e.g., the AI service is
  unavailable)? The system should preserve the session, mark the failing
  status step as failed, and allow retry from that step without re-entering the
  product or re-paying.
- What happens if the user reloads the page while on a status page (pre- or
  post-payment)? The system should resume the status view at the correct step
  based on the session's persisted progress, not restart from the beginning.
- What happens when a user opens the result link in a different browser or
  after clearing cookies? Since sessions are anonymous and browser-bound, the
  result is not recoverable cross-device; the user must start a new session.
  This is an accepted MVP limitation.
- What happens when a Stripe webhook is delayed or lost? The system should
  reconcile payment status on the user's return to the session and unlock
  outputs once payment is confirmed, without double-charging.
- What happens when a user attempts to pay twice for the same session? The
  system should detect an existing successful payment and prevent a second
  charge.
- What happens when a user returns to a session that has expired (older than 7
  days)? The system should show a friendly message explaining the session has
  expired and invite the user to start a new one.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST accept a product URL as input, including URLs from
  Amazon, Shopify, and arbitrary public product pages.
- **FR-002**: System MUST accept a product photo upload (JPG/PNG) as an
  alternative to a URL.
- **FR-003**: System MUST derive product context (name, category, apparent
  benefits, audience signals, and buyer profile) from the submitted URL or
  photo. When the input is a URL, the system MUST extract available text (name,
  description, price, bullet points/features) and the primary product image from
  the page.
- **FR-004**: System MUST associate all inputs and generated outputs with an
  anonymous browser session, with no account creation or login required.
- **FR-005**: System MUST retain session state (product input and any generated
  outputs) across page reloads within the same browser session, for a minimum of
  7 days from session creation.
- **FR-005e**: During the "Analyzing product" step, the system MUST generate
  Buyer Insights for the product, including: buyer profile, main desire, pain
  points, buying triggers, and objections.
- **FR-005a**: After a URL or photo is submitted, the system MUST navigate the
  user to a dedicated status page that displays three sequential processing
  steps in order: "Extracting product information", "Analyzing product", and
  "Generating ad angles".
- **FR-005b**: The status page MUST show the real-time state of each step —
  pending, in progress, or complete — and advance the in-progress marker to the
  next step as each one finishes.
- **FR-005c**: When all three status steps complete, the system MUST
  automatically navigate the user to the ad-angle preview page.
- **FR-005d**: If a status step fails, the system MUST mark that step as failed
  and offer a retry that re-attempts from the failed step without losing
  progress from already-completed steps.
- **FR-006**: System MUST generate exactly five ad angles labeled convenience,
  time saving, pain point, healthy lifestyle, and perfect gift.
- **FR-007**: System MUST pair each ad angle with exactly one strong hook.
- **FR-008**: System MUST present the five angles, hooks, and Buyer Insights to
  the user before requiring payment.
- **FR-009**: System MUST present a one-time Stripe payment option to unlock
  the remaining outputs (three ready-to-run ad creatives and testing plan) after
  angles, hooks, and Buyer Insights are shown.
- **FR-010**: System MUST integrate with Stripe for one-time checkout and
  record the payment status against the session.
- **FR-011**: System MUST unlock the remaining outputs only after a confirmed
  successful payment for the session.
- **FR-011a**: After a successful payment, the system MUST navigate the user to
  a post-payment status page that displays three sequential steps in order:
  "Generating concepts", "Generating creatives", and "Building testing plan".
- **FR-011b**: The post-payment status page MUST show the real-time state of
  each step — pending, in progress, or complete — and advance the in-progress
  marker to the next step as each one finishes.
- **FR-011c**: When all three post-payment status steps complete, the system
  MUST display the three ready-to-run ad creatives (image + copy + CTA) and the
  testing plan, organized by the AI-selected ad angle.
- **FR-011d**: If a post-payment status step fails, the system MUST mark that
  step as failed and offer a retry that re-attempts from the failed step without
  losing prior progress or requiring re-payment.
- **FR-012**: System MUST prevent duplicate charges for the same session.
- **FR-013**: System MUST internally score the five ad angles and select the top
  three for the paid full-campaign creatives.
- **FR-013a**: System MUST generate exactly one ad concept for each of the top
  three AI-selected ad angles (three concepts total).
- **FR-014**: System MUST generate, for each selected ad concept, a ready-to-run
  ad creative consisting of a generated ad image, a primary text block, a
  headline, and a call-to-action.
- **FR-015**: System MUST display the three selected ad creatives and concepts
  organized by their parent ad angle.
- **FR-016**: System MUST allow the user to copy individual primary texts,
  headlines, and calls-to-action to the clipboard.
- **FR-016a**: System MUST allow the user to download a single formatted PDF
  containing all generated artifacts — Buyer Insights, the five ad angles with
  hooks, the three selected ad concepts with their ad creatives, and the testing
  plan.
- **FR-017**: System MUST generate a testing plan that includes budget
  allocation, audience guidance, testing duration, and key metrics to watch,
  tailored to Meta (Facebook/Instagram) and TikTok as the target ad platforms.
- **FR-018**: System MUST make the testing plan reference all five generated ad
  angles, with extra emphasis on the three AI-selected angles used for the
  creatives.
- **FR-019**: System MUST allow the testing plan to be copied to the clipboard
  individually, in addition to being included in the full PDF download
  (FR-016a).
- **FR-020**: System MUST show user-friendly error messages with retry options
  for invalid input, unreachable URLs, unsupported images, and generation
  failures.
- **FR-021**: System MUST preserve session data and payment status across
  generation retries so the user never re-pays for the same session.
- **FR-022**: System MUST display progress feedback while any generation step
  is running, surfaced through the status page step states (see FR-005a).
- **FR-023**: The one-time price for unlocking full outputs MUST be a fixed
  $9 USD charge per session.

### Key Entities *(include if feature involves data)*

- **Session**: An anonymous browser-bound workspace that owns one product
  input, the generated angles/hooks, the generated concepts/creatives, the
  testing plan, and the payment status. Identified by a session token stored
  in the browser; not tied to a user account. A session and all its data
  expire and are purged 7 days after creation.
- **Product Input**: The user-submitted product reference — either a URL or an
  uploaded image — plus the derived product context. For URL inputs, the
  product context includes extracted text (name, description, price, features)
  and the primary product image. For photo uploads, the product context is
  derived from the image. Belongs to exactly one Session.
- **Ad Angle**: One of five labeled creative framings (convenience, time
  saving, pain point, healthy lifestyle, perfect gift). Has one Hook. Belongs
  to a Session. Internally scored so the top three can be selected for the paid
  full-campaign creatives.
- **Hook**: A single attention-grabbing opening line attached to an Ad Angle.
- **Buyer Insights**: A free preview artifact derived from the product context.
  Includes buyer profile, main desire, pain points, buying triggers, and
  objections. Belongs to a Session.
- **Ad Concept**: A creative execution of one of the top three AI-selected
  Ad Angles. One per selected angle. Has one Ad Creative.
- **Ad Creative**: A ready-to-run ad artifact for an Ad Concept — a generated
  ad Image, a Primary Text body, a Headline, and a Call-to-Action.
- **Testing Plan**: A structured recommendation document tied to a Session,
  covering budget allocation, audience guidance, duration, and metrics for
  Meta (Facebook/Instagram) and TikTok, referencing the five Ad Angles with
  extra emphasis on the three selected angles.
- **Payment**: A record of a one-time Stripe charge against a Session, with a
  status (pending, succeeded, failed) and a Stripe identifier. A Session has
  at most one succeeded Payment.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can go from landing on the page to viewing five ad angles
  with hooks in under 2 minutes for a typical product.
- **SC-002**: After completing payment, a user can view three ready-to-run ad
  creatives (each with image, primary text, headline, and CTA), plus the full
  testing plan, in under 3 minutes total from initial input.
- **SC-003**: At least 90% of valid product URL submissions and valid product
  photo submissions result in successfully generated ad angles on the first
  attempt.
- **SC-004**: At least 95% of users who complete a successful Stripe payment
  see their full unlocked outputs without needing to refresh or contact
  support.
- **SC-005**: No user is charged more than once for the same session in 100% of
  cases.
- **SC-006**: At least 80% of users surveyed agree the testing plan is
  actionable without prior media-buying experience.
- **SC-007**: The system handles 50 concurrent anonymous generation sessions
  without noticeable degradation in response time.
- **SC-008**: 100% of generation failures present a recoverable retry path that
  preserves the session and any prior payment.

## Assumptions

- Users have stable internet connectivity and a modern browser; offline use is
  out of scope for the MVP.
- The MVP is desktop-first; a responsive mobile layout is desirable but not a
  P1 acceptance criterion.
- Anonymous sessions are browser-bound and not recoverable across devices or
  after cookies are cleared. Cross-device persistence and accounts are
  explicitly out of scope for the MVP. Sessions and their data expire 7 days
  after creation.
- Product context extraction from URLs relies on the target page being public
  and parseable; pages behind logins, paywalls, or heavy bot protection may
  fail and will surface a retry prompt. URL extraction captures available text
  (name, description, price, features) and the primary product image; it does
  not crawl galleries, reviews, or variant data in the MVP.
- Product context extraction from photos relies on the image clearly showing a
  recognizable product; the MVP does not perform advanced computer-vision
  scene understanding beyond what is needed to generate the five angles and Buyer
  Insights.
- The three ready-to-run ad creatives include AI-generated ad images, but the
  MVP does not provide photo editing, custom brand asset uploads, or manual
  image refinement.
- The five ad angle categories are fixed for the MVP (convenience, time saving,
  pain point, healthy lifestyle, perfect gift); user-defined custom angles are
  out of scope.
- Exactly one hook per angle, one concept per selected angle, and one
  ready-to-run ad creative (image + primary text + headline + CTA) per selected
  concept are generated for the MVP. Multiple variations per angle are out of
  scope.
- Stripe checkout is used in test mode during development and switched to live
  mode for launch; webhook-based payment reconciliation is included.
- The one-time price is a single fixed amount per session (no tiers, no
  subscriptions) for the MVP.
- The testing plan is generated from the same product context and angles; it
  does not integrate with live ad platform APIs in the MVP. The plan is
  tailored to Meta (Facebook/Instagram) and TikTok as the target platforms;
  other platforms (Google Ads, LinkedIn, etc.) are out of scope for the MVP.
- The existing scaffolded OpenAI helper and Supabase clients in the codebase
  will be reused for generation and session storage respectively, per the
  project conventions.
