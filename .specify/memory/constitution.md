<!--
Sync Impact Report
==================
Version change: (uninitialized template) → 1.0.0

Modified principles:
- [PRINCIPLE_1_NAME] → I. App Router & Server-Component First
- [PRINCIPLE_2_NAME] → II. Type Safety & Strictness
- [PRINCIPLE_3_NAME] → III. Verification Gates (NON-NEGOTIABLE)
- [PRINCIPLE_4_NAME] → IV. Secret & Environment Discipline
- [PRINCIPLE_5_NAME] → V. Conventions Over Invention

Added sections:
- "Technology Stack & Constraints" (replaces [SECTION_2_NAME])
- "Development Workflow & Quality Gates" (replaces [SECTION_3_NAME])
- Governance rules (replaces [GOVERNANCE_RULES])

Removed sections: none

Templates requiring updates:
- .specify/templates/plan-template.md        ✅ no change needed (Constitution Check gate is generic)
- .specify/templates/spec-template.md        ✅ no change needed (no principle-specific references)
- .specify/templates/tasks-template.md       ✅ no change needed (task phases are generic)
- .specify/templates/checklist-template.md   ✅ no change needed (generic)
- .specify/templates/commands/*.md           ✅ n/a (no commands directory present)
- README.md                                  ✅ no change needed (default Next.js README, no principle refs)

Follow-up TODOs: none. All placeholders resolved.
-->

# AngleCraft Constitution

## Core Principles

### I. App Router & Server-Component First

AngleCraft is a Next.js 16 App Router application. Every route and component
MUST default to a Server Component. The `"use client"` directive MUST be added
only to leaf components that require browser-only APIs, state, effects, or
event handlers. Interactive UI MUST be isolated into small client components
that receive data via props from Server Component parents.

- The `app/` directory is the sole routing surface; the Pages Router MUST NOT
  be introduced.
- `proxy.ts` (Next.js 16's renamed middleware) is the only middleware file;
  its matcher MUST continue excluding static assets.
- Data fetching and Supabase server reads MUST happen in Server Components or
  route handlers, never in client components.

Rationale: Server Components reduce client JavaScript, keep secrets server-side,
and align with the framework's intended data flow. Client bloat and accidental
secret exposure are the primary failure modes this principle prevents.

### II. Type Safety & Strictness

TypeScript is configured with `strict: true` and this MUST remain enabled.

- The `@/*` path alias MUST be used for all project-internal imports; relative
  imports across `lib/`, `components/`, and `app/` are forbidden.
- `any` MUST NOT be introduced; use `unknown` with type narrowing or explicit
  interfaces when a type is genuinely dynamic.
- API route handlers MUST validate input and return `NextResponse.json(...)`
  with explicit status codes (see `app/api/chat/route.ts`).
- `pnpm exec tsc --noEmit` MUST pass with zero errors before any change is
  considered complete.

Rationale: Strict typing catches an entire class of runtime errors at compile
time and enforces the contracts between Supabase, OpenAI helpers, and the UI.

### III. Verification Gates (NON-NEGOTIABLE)

No work item is complete until ALL of the following pass, in order:

1. `pnpm lint` — zero lint errors.
2. `pnpm exec tsc --noEmit` — zero type errors.
3. `pnpm build` — succeeds (this catches App Router / RSC issues that lint
   and tsc miss).
4. Manual exercise of changed routes/components in `pnpm dev` when behavior is
   not fully covered by types.

Skipping a gate because "it's just a small change" is not permitted. If a gate
fails, the root cause MUST be fixed before proceeding.

Rationale: Next.js 16 has breaking changes versus older releases, and RSC
constraints are not fully caught by `tsc`. The build gate is the only reliable
safeguard against runtime App Router failures.

### IV. Secret & Environment Discipline

All secrets live in `.env.local`, which is gitignored and MUST never be
committed.

- Server-only secrets (`OPENAI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) MUST NOT
  be prefixed with `NEXT_PUBLIC_`. Anything read in the browser MUST be
  `NEXT_PUBLIC_*`.
- Secrets MUST NEVER be logged, returned in API responses, or passed into
  client component props.
- If a required environment variable is missing, the relevant helper
  (`lib/openai.ts`, `lib/supabase/*`) MUST throw an explicit error rather than
  fail silently.
- Supabase uses `@supabase/ssr` cookie-based sessions; the service-role key
  MUST only be used server-side and never shipped to the browser client.

Rationale: A single leaked service-role key or OpenAI key compromises the entire
backend. The `NEXT_PUBLIC_` boundary is the framework's only enforcement point,
so discipline here is the last line of defense.

### V. Conventions Over Invention

Before adding new code, agents MUST mirror existing patterns in `lib/`,
`components/ui/`, and `app/api/chat/route.ts`.

- Class merging MUST go through `cn()` from `@/lib/utils` (clsx +
  tailwind-merge); ad-hoc string concatenation of Tailwind classes is
  forbidden.
- Styling uses Tailwind CSS v4 via `@tailwindcss/postcss`; the theme lives in
  `app/globals.css` (`@theme inline`, CSS variables). There is NO
  `tailwind.config.js` and one MUST NOT be introduced.
- shadcn/ui components in `components/ui/` are owned by the project and MAY be
  edited freely; new primitives MUST be added via
  `pnpm dlx shadcn@latest add <component>`.
- Fonts are exposed as CSS variables (`--font-inter`, `--font-space-grotesk`,
  `--font-geist-mono`) set on `<html>` and referenced via `var(--font-...)` or
  the `font-sans` / `font-heading` / `font-mono` theme tokens.
- The package manager is `pnpm` (lockfile `pnpm-lock.yaml`); `package-lock.json`
  and `yarn.lock` MUST NOT be introduced.

Rationale: Consistency lets every contributor read any file with the same mental
model and keeps the Tailwind v4 / shadcn toolchain functioning as designed.

## Technology Stack & Constraints

- **Framework:** Next.js 16.2.9 (App Router). Read
  `node_modules/next/dist/docs/` before touching Next APIs — this version has
  breaking changes versus older releases.
- **React:** 19.2.4.
- **Language:** TypeScript 5, `strict: true`, path alias `@/*` → project root.
- **Styling:** Tailwind CSS v4 via `@tailwindcss/postcss`, `tw-animate-css`,
  `shadcn/tailwind.css`. Config in `app/globals.css` — no `tailwind.config.js`.
- **UI:** shadcn/ui (style `radix-nova`, base color `neutral`,
  `cssVariables: true`, icon library `lucide`). Icons via `lucide-react`.
- **Auth/Data:** Supabase via `@supabase/ssr`. Browser client
  `@/lib/supabase/client`; server client `@/lib/supabase/server`; session
  refresh in `proxy.ts`.
- **AI:** OpenAI SDK. Helper in `@/lib/openai.ts`; chat endpoint at
  `app/api/chat/route.ts`. `OPENAI_MODEL` is optional and defaults to
  `gpt-4o-mini`.
- **Package manager:** `pnpm` only.
- **Testing:** No test runner is configured. If one is added, prefer Vitest and
  document the run command in `AGENTS.md`.

Required environment variables (all in `.env.local`):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server only)
- `OPENAI_API_KEY` (server only)
- `OPENAI_MODEL` (optional)

## Development Workflow & Quality Gates

| Task | Command |
| --- | --- |
| Install deps | `pnpm install` |
| Dev server | `pnpm dev` (http://localhost:3000) |
| Production build | `pnpm build` |
| Start prod build | `pnpm start` |
| Lint | `pnpm lint` |
| Typecheck | `pnpm exec tsc --noEmit` |

Quality gates (in order, all MUST pass — see Principle III):

1. `pnpm lint`
2. `pnpm exec tsc --noEmit`
3. `pnpm build`
4. Manual exercise in `pnpm dev` when types do not fully cover behavior.

Workflow rules:

- Comments MUST NOT be added unless requested; existing comments MUST be
  preserved when editing.
- API routes MUST validate input and log errors server-side.
- New interactive UI MUST be isolated client components; the landing page
  (`app/page.tsx`) is currently a `"use client"` component and new features
  SHOULD NOT balloon it further.
- The Supabase clients and `/api/chat` endpoint are scaffolded but not yet
  wired into `app/page.tsx`; when connecting them, follow the existing
  patterns in `lib/` and `app/api/chat/route.ts`.

## Governance

This constitution supersedes all other development practices for AngleCraft.
Where `AGENTS.md` provides runtime development guidance, it MUST remain
consistent with this constitution; conflicts MUST be resolved in favor of the
constitution, and `AGENTS.md` MUST be updated to match.

Amendment procedure:

- Any change to a Core Principle, the Technology Stack & Constraints, or the
  Quality Gates is a constitution amendment and MUST be documented via a
  version bump (see below) plus a Sync Impact Report prepended to this file.
- Amendments MUST include a rationale and, where breaking, a migration note.
- `AGENTS.md` MUST be updated whenever build commands, conventions, or
  architecture change, and kept in sync with this constitution.

Versioning policy (semantic versioning):

- **MAJOR**: backward-incompatible governance changes — principle removals or
  redefinitions that invalidate prior plans/specs.
- **MINOR**: a new principle or materially expanded guidance.
- **PATCH**: clarifications, wording, typo fixes, non-semantic refinements.

Compliance review:

- Every plan (`/speckit-plan`) MUST pass the Constitution Check gate before
  Phase 0 research and re-check it after Phase 1 design.
- Every PR/review MUST verify compliance with the Core Principles and Quality
  Gates.
- Complexity beyond the conventions in Principle V MUST be justified in the
  plan's Complexity Tracking table.

Runtime development guidance: see `AGENTS.md`.

**Version**: 1.0.0 | **Ratified**: 2026-06-24 | **Last Amended**: 2026-06-24
