# CLAUDE.md — Reading Journal

Personal reading journal app for Mor. Single user, Hebrew UI (RTL), mobile first, synced across phone and desktop.

Mor is male — address him in masculine Hebrew.

The full functional spec is in `SPEC.md`. Read it before doing anything.

## Working rules (non-negotiable)

1. **Never write code before Mor approves the plan.** For every stage and every non-trivial change: describe what will be built, which files are created or changed, and what the tests will cover. Wait for an explicit "approved" before writing any code.
2. **Work stage by stage** as defined in SPEC.md (stages 1–7). Do not start a stage before the previous one is tested and approved by Mor. Stages 1–5 are tested on the desktop (localhost, `npm run dev`); from stage 6 on, Mor also tests on the phone via GitHub Pages.
3. **Every stage includes tests.** Unit tests for calculations and status transitions, component tests for screens. Use Vitest + React Testing Library. A stage is not done until `npm test` passes.
4. **Security tests exist once, in stage 1 only**: one small file testing Firestore rules with the Firebase Emulator (unauthenticated users are blocked; a signed-in user can read and write only under their own `users/{uid}`). Extend it only when a new collection is added.
5. **Never deploy without Mor's explicit approval.** Deployment to GitHub Pages is a manually triggered workflow. Never run it, never trigger it, never push to `main` unless Mor says so. The same applies to the Cloudflare Worker: `wrangler dev` (local) is fine, `wrangler deploy` and `wrangler secret put` only with Mor's approval.
6. **Never commit secrets.** Firebase config, the Google Books API key and the Worker URL live in `.env.local` (gitignored). Use `VITE_` prefixed variables. Worker secrets (`NLI_API_KEY`, `TAVILY_API_KEY`, `COVER_SIGNING_KEY`) live in Cloudflare, and locally in `worker/.dev.vars` (gitignored).
7. **Code comments in English only.** Never write comments in Hebrew. UI strings are in Hebrew.
8. **Keep the code modular** — the project may grow in other directions later. Separate data access, business logic (calculations, status transitions) and UI components.
9. At the end of each stage, summarize what was built and what Mor should check. Until stage 6: Mor runs `npm run dev` and tests on the desktop (localhost). From stage 6: Mor also tests on the phone via the GitHub Pages deployment. Mor approves; only then commit.

## Stack

- React + Vite (JavaScript), React Router
- Firebase: Auth (Google sign-in), Firestore (realtime via `onSnapshot`). The Firestore database is named `default` (not `(default)`); see `src/firebase/config.js` and `firebase.json`.
- **No Firebase Storage** (it requires the Blaze plan). Every cover is compressed client-side (canvas, WebP/JPEG, ~40KB max) and stored as a data URL in `coverData`; `coverUrl` keeps the link it came from as a display fallback. `coverData` wins when both exist. Open Library covers have CORS and are fetched directly; Google Books and image search results go through the Worker's `/cover` (search results only with the Worker's HMAC signature, so `/cover` is not an open proxy).
- Book search: Google Books (browser, `VITE_GOOGLE_BOOKS_API_KEY`) and the National Library of Israel (through the Worker), merged in `src/lib/searchMerge.js`
- Cloudflare Worker in `worker/` (`/cover`, `/nli`, `/images`); the app reaches it via `VITE_BRIDGE_URL`. Without it those features are skipped. Image search provider: Tavily Search API with `include_images` (`worker/src/providers/tavily.js`; free tier, no card)
- Recharts for statistics
- Vitest + React Testing Library; `@firebase/rules-unit-testing` with the emulator for security rules
- PWA (manifest + service worker), deployed to GitHub Pages via GitHub Actions
- `dir="rtl"`, Hebrew font, dates displayed as dd/MM/yyyy

## Suggested structure

```
src/
  firebase/       # app init, auth helpers, Firestore access
  api/            # external APIs (Google Books, NLI, cover sources, Worker client)
  lib/            # pure business logic: reading days, status transitions, goal progress, stats
  components/     # shared UI components
  screens/        # Shelf, NewBook, BookPage, WantToRead, Goals, Stats, Settings
  hooks/          # data hooks (useBooks, useBook, useGoals)
  test/           # test setup and shared test utilities
worker/           # Cloudflare Worker (own package.json; its tests run with the root `npm test`)
firestore.rules
```

## Data model (summary — see SPEC.md for full details)

- `users/{uid}/books/{bookId}` — title, author, genre, pages, isbn, coverUrl, coverData, status (want | reading | finished | abandoned), startDate, endDate, summary, rating, review, abandonReason, tags, createdAt, updatedAt
- `users/{uid}/books/{bookId}/notes/{noteId}` — text, createdAt
- `users/{uid}/books/{bookId}/quotes/{quoteId}` — text, page, createdAt
- `users/{uid}/goals/{goalId}` — name, type (books | pages | genre), target, genre, period (monthly | yearly | custom), startDate, endDate, recurring, seriesId. Each period of a recurring goal is its own document with id `{seriesId}__{periodKey}`.

Notes and quotes are unlimited; the book page scrolls. Goals are always editable.

## Commands

- `npm run dev` — local dev server
- `npm test` — run all tests
- `npm run test:rules` — security rules tests against the Firebase Emulator
- `npm run build` — production build
- `npm run preview` — serve the build locally (the service worker only runs here, not in `npm run dev`)
- `npm run generate-icons` — regenerate the PNG icons and favicon in `public/` from `public/icon.svg`
- `cd worker && npm run dev` — run the Worker locally on http://localhost:8787 (secrets from `worker/.dev.vars`)
