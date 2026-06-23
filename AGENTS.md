<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# AngleCraft — Agent Guide

AngleCraft is an **AI Creative Strategist** that generates and organizes your next ad testing sprint. It is a Next.js 16 App Router app (React 19, TypeScript, Tailwind v4, shadcn/ui) with Supabase for auth/data and OpenAI for generation.

## Quick Reference

| Task | Command |
| --- | --- |
| Install deps | `pnpm install` |
| Dev server | `pnpm dev` (http://localhost:3000) |
| Production build | `pnpm build` |
| Start prod build | `pnpm start` |
| Lint | `pnpm lint` |
| Typecheck | `pnpm exec tsc --noEmit` |

**Package manager: `pnpm`** (lockfile is `pnpm-lock.yaml`). Do not introduce `package-lock.json` or `yarn.lock`. There is no test runner configured.

## Tech Stack

- **Framework:** Next.js 16.2.9 (App Router, `app/` directory). Read `node_modules/next/dist/docs/` before touching Next APIs — this version has breaking changes vs. older releases.
- **React:** 19.2.4 (use Server/Client Components correctly; default to Server Components, add `"use client"` only when needed).
- **Language:** TypeScript 5, `strict: true`. Path alias `@/*` → project root (e.g. `@/lib/utils`, `@/components/ui/button`).
- **Styling:** Tailwind CSS v4 via `@tailwindcss/postcss`. Config lives in `app/globals.css` (`@theme inline`, CSS variables) — there is **no `tailwind.config.js`**. Uses `tw-animate-css` and `shadcn/tailwind.css`.
- **UI:** shadcn/ui (style `radix-nova`, base color `neutral`, `cssVariables: true`, `iconLibrary: lucide`). Components live in `components/ui/` and are owned by you (edit freely). Add new ones via `pnpm dlx shadcn@latest add <component>`.
- **Icons:** `lucide-react`.
- **Auth/Data:** Supabase via `@supabase/ssr` (SSR cookie-based sessions). Browser client: `@/lib/supabase/client`; Server client: `@/lib/supabase/server`; middleware refresh in `proxy.ts`.
- **AI:** OpenAI SDK (`openai`). Helper in `@/lib/openai.ts`; chat endpoint at `app/api/chat/route.ts`.

## Project Structure

```
app/
  layout.tsx          Root layout: fonts (Inter, Space Grotesk, Geist Mono), metadata
  page.tsx            Landing page (large client component, ~1100 lines)
  globals.css         Tailwind v4 theme + design tokens
  api/chat/route.ts   POST endpoint -> generateChatCompletion
components/
  ui/                 shadcn primitives (badge, button, card, input)
lib/
  utils.ts            cn() helper (clsx + tailwind-merge)
  openai.ts           OpenAI client + generateChatCompletion
  supabase/
    client.ts         Browser Supabase client
    server.ts         Server Supabase client (reads cookies)
proxy.ts              Middleware: refreshes Supabase auth session
```

## Conventions

- **Imports:** use the `@/` alias for all project-internal imports.
- **Class merging:** always use `cn()` from `@/lib/utils` to merge Tailwind classes.
- **Fonts:** exposed as CSS variables (`--font-inter`, `--font-space-grotesk`, `--font-geist-mono`) set on `<html>` in `app/layout.tsx`. Reference via `var(--font-...)` or the `font-sans` / `font-heading` / `font-mono` theme tokens.
- **Server vs Client:** keep things as Server Components by default. `app/page.tsx` is currently a `"use client"` landing page. New interactive UI should be isolated client components.
- **API routes:** return `NextResponse.json(...)` with explicit status codes. Validate input and log errors server-side (see `app/api/chat/route.ts`).
- **Env access:** server-only secrets (`OPENAI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) must never be prefixed with `NEXT_PUBLIC_`. Anything read in the browser must be `NEXT_PUBLIC_*`.
- **Do not** add comments unless requested; preserve existing comments when editing.

## Environment Variables

All live in `.env.local` (gitignored). Required:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server only — never expose to client)
- `OPENAI_API_KEY` (server only)
- `OPENAI_MODEL` (optional; defaults to `gpt-4o-mini` in `lib/openai.ts`)

Never commit secrets. Never log keys. If a var is missing, the relevant helper throws explicitly.

## Verification Checklist

Before considering work done:

1. `pnpm lint` passes.
2. `pnpm exec tsc --noEmit` passes (no type errors).
3. `pnpm build` succeeds (catches App Router / RSC issues that lint/tsc miss).
4. Manually exercise changed routes/components in `pnpm dev` if behavior isn't covered by types.

## Notes for AI Agents

- The Supabase clients and `/api/chat` endpoint are scaffolded but **not yet wired into `app/page.tsx`** (currently a static landing page). When connecting them, follow the existing patterns in `lib/` and `app/api/chat/route.ts`.
- `proxy.ts` is the middleware file (Next.js 16 renamed `middleware.ts` → `proxy.ts`). It refreshes Supabase sessions; keep its matcher excluding static assets.
- There is no test framework. If you add one, prefer Vitest and document the run command here.
- Keep this file updated when you change build commands, conventions, or architecture.
