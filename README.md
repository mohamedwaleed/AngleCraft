# AngleCraft

AngleCraft is an AI Creative Strategist that turns a product URL or photo into a
ready-to-run Meta Ads testing sprint: five ad angles with hooks, three
ready-to-run ad creatives (image + copy + CTA), and a structured Campaign Launch Plan.

## What it does

1. **Capture product input** — paste a product URL or upload a photo.
2. **Extract and analyze** — the system extracts product context and generates
   Customer Insights (target buyer, pain, desire, trigger, objection, emotion).
3. **Generate ad angles** — produces five distinct angles with hooks, then
   selects the top three using a deterministic scoring framework.
4. **Generate creatives** — for each selected angle, creates a concept, headline,
   primary text, CTA, and AI-generated image.
5. **Build the Campaign Launch Plan** — recommends testing priorities, lays out a
   unified testing setup for all three creatives, budget intensity tiers, a creative
   strategy summary, and a day-by-day workflow.
6. **Download** — export the full Campaign Launch Plan as a formatted PDF or copy individual
   pieces of copy to the clipboard.

## Pricing

AngleCraft is free to start: submit a product URL and get five ad angles, hooks,
and Buyer Insights at no cost.

Upgrade to the full Campaign Launch Plan for a one-time **$4.99** payment
(regular $8.99). The launch price is available for the first 100 users and
unlocks:

- 3 ready-to-run ad creatives (image + headline + copy + CTA)
- The full Campaign Launch Plan with testing phases, budgets, and decision rules
- A creative strategy summary with testing roles
- PDF export

Payment is handled securely through Stripe. No subscription, no hidden fees.

## Tech stack

- **Framework:** Next.js 16.2.9 (App Router, React 19, TypeScript 5)
- **Styling:** Tailwind CSS v4, shadcn/ui
- **Backend / data:** Supabase (Postgres, Edge Functions, Storage, Queue, Migrations)
- **AI:** OpenAI (`gpt-4o` for text, `gpt-image-1` for images)
- **Payments:** Stripe Checkout Sessions

## Getting started

```bash
# Install dependencies
pnpm install

# Start the Next.js dev server
pnpm dev

# In a separate terminal, start the Supabase local stack
pnpm exec supabase start

# Apply migrations
pnpm exec supabase migration up

# Serve Edge Functions
pnpm exec supabase functions serve --env-file ./supabase/.env --no-verify-jwt
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Environment variables

Create `.env.local` from the example:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
STRIPE_SECRET_KEY=           # local/dev only; production reads from Supabase Vault
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
OPENAI_API_KEY=
```

In production, `STRIPE_SECRET_KEY` is read from Supabase Vault instead of an env file. After applying the `stripe_secret_vault` migration, insert the live key:

```sql
select vault.create_secret('sk_live_...', 'STRIPE_SECRET_KEY');
```

Edge Function secrets live in `supabase/.env`:

```bash
OPENAI_API_KEY=
```

## Documentation

- [Agent guide](./AGENTS.md)
- [Feature spec](./specs/001-ad-angle-mvp/spec.md)
- [Plan](./specs/001-ad-angle-mvp/plan.md)
- [Data model](./specs/001-ad-angle-mvp/data-model.md)
- [API contracts](./specs/001-ad-angle-mvp/contracts/api-contracts.md)
- [AI contracts](./specs/001-ad-angle-mvp/contracts/ai-contracts.md)

## Verification

Before committing, run the standard checks:

```bash
pnpm lint
pnpm exec tsc --noEmit
pnpm build
```

## License

Proprietary — All rights reserved.
