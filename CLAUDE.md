# CLAUDE.md — Reading Journal

Personal reading journal app for Mor. Single user, Hebrew UI (RTL), mobile first, synced across phone and desktop.

Mor is male — address him in masculine Hebrew.

The full functional spec is in `SPEC.md`. Read it before doing anything.

## Working rules (non-negotiable)

1. **Never write code before Mor approves the plan.** For every stage and every non-trivial change: describe what will be built, which files are created or changed, and what the tests will cover. Wait for an explicit "approved" before writing any code.
2. **Work stage by stage** as defined in SPEC.md (stages 1–7). Do not start a stage before the previous one is tested on the phone and approved by Mor.
3. **Every stage includes tests.** Unit tests for calculations and status transitions, component tests for screens. Use Vitest + React Testing Library. A stage is not done until `npm test` passes.
4. **Security tests exist once, in stage 1 only**: one small file testing Firestore rules with the Firebase Emulator (unauthenticated users are blocked; a signed-in user can read and write only under their own `users/{uid}`). Extend it only when a new collection is added.
5. **Never deploy without Mor's explicit approval.** Deployment to GitHub Pages is a manually triggered workflow. Never run it, never trigger it, never push to `main` unless Mor says so.
6. **Never commit secrets.** Firebase config and the Google Books API key live in `.env.local` (gitignored). Use `VITE_` prefixed variables.
7. **Code comments in English only.** Never write comments in Hebrew. UI strings are in Hebrew.
8. **Keep the code modular** — the project may grow in other directions later. Separate data access, business logic (calculations, status transitions) and UI components.
9. At the end of each stage, summarize what was built and what Mor should check on the phone. Mor runs `npm run dev`, tests on the phone and approves. Only then commit.

## Stack

- React + Vite (JavaScript), React Router
- Firebase: Auth (Google sign-in), Firestore (realtime via `onSnapshot`). The Firestore database is named `default` (not `(default)`); see `src/firebase/config.js` and `firebase.json`.
- **No Firebase Storage** (it requires the Blaze plan). Every cover — from Google Books or a manual upload — is compressed client-side (canvas, JPEG/WebP, ~40KB max) and stored as a data URL in the book's `coverData` field.
- Google Books API for cover, author and page count lookup
- Recharts for statistics
- Vitest + React Testing Library; `@firebase/rules-unit-testing` with the emulator for security rules
- PWA (manifest + service worker), deployed to GitHub Pages via GitHub Actions
- `dir="rtl"`, Hebrew font, dates displayed as dd/MM/yyyy

## Suggested structure

```
src/
  firebase/       # app init, auth helpers, Firestore access
  lib/            # pure business logic: reading days, status transitions, goal progress, stats
  components/     # shared UI components
  screens/        # Shelf, NewBook, BookPage, WantToRead, Goals, Stats, Settings
  hooks/          # data hooks (useBooks, useBook, useGoals)
  test/           # test setup and shared test utilities
firestore.rules
```

## Data model (summary — see SPEC.md for full details)

- `users/{uid}/books/{bookId}` — title, author, genre, pages, coverData, status (want | reading | finished | abandoned), startDate, endDate, summary, rating, review, abandonReason, tags, createdAt, updatedAt
- `users/{uid}/books/{bookId}/notes/{noteId}` — text, createdAt
- `users/{uid}/books/{bookId}/quotes/{quoteId}` — text, page, createdAt
- `users/{uid}/goals/{goalId}` — name, type (books | pages | genre), target, genre, period (monthly | yearly | custom), startDate, endDate, recurring

Notes and quotes are unlimited; the book page scrolls. Goals are always editable.

## Commands

- `npm run dev` — local dev server
- `npm test` — run all tests
- `npm run test:rules` — security rules tests against the Firebase Emulator
- `npm run build` — production build
