# Household App byStonies — Agent Notes

A standard Next.js (App Router) + TypeScript app for couples to manage shared household tasks, expenses, and calendars. Uses Supabase for auth/data, Tailwind CSS for styling.

## Working here
- Install: `npm ci` — Dev: `npm run dev` — Build: `npm run build` — Lint: `npm run lint`
- App routes live under `app/` (e.g. `app/tasks`, `app/expenses`, `app/shopping`, `app/calendar`, `app/settings`, `app/login`), each with its own `components/` subfolder where present.
- Shared UI lives in `components/`, shared logic in `lib/` and `app/lib`, React context in `app/context`.
- `app/api/agent/route.ts` is a protected endpoint (checks `x-agent-token` against `AGENT_TRIGGER_TOKEN`) that dispatches the CI workflow — see `README.md` for the full automation/secrets setup.

## Notes
- The UI is bilingual (German/English). Every user-facing string goes through `const { t } = useI18n()` from `app/context/LanguageContext.tsx` as `t("English", "Deutsch")`; outside React, store `{ en, de }` pairs and pick with the current `lang`. The DE/EN switch is `components/LanguageSwitcher.tsx`. German copy follows `.claude/skills/onboarding-tone`. Text people typed (task titles, categories, room names) is shown as written.
- Follow this repo's actual Next.js version and conventions (check `package.json`/installed docs) rather than assuming defaults.

## Documents: HTML instead of Markdown
- When writing new documents (research, plans, notes, reports, feature docs), use self-contained `.html` files — not `.md`. Put them in `docs/` (e.g. `docs/feature-research.html`).
- Keep them standalone: semantic HTML, inline `<style>`, no build step or external dependencies, readable on a phone, light and dark mode via `prefers-color-scheme`.
- Exceptions that must stay Markdown because tooling reads them: `CLAUDE.md`, `AGENTS.md`, `README.md`, and `.claude/skills/*/SKILL.md`.
- Existing `.md` files are left as is unless asked to convert them (`docs/FEATURE_RESEARCH.md` has already been converted to `docs/feature-research.html`).

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
