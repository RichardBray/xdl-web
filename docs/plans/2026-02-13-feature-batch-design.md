# XDL-Web Feature Batch Design

## Features Overview

1. Pino API logging
2. Idle timeout update (200s) with frontend warning banner
3. Client-side caching (localStorage) for previously downloaded videos
4. Transcript tab with SRT-style timestamps on Article page
5. Twitter-inspired UI refresh
6. Pro page with dummy features and sign-up flow
7. E2E tests for all new features

---

## 1. Pino API Logging

Replace all `console.log/warn/error` in `api/server.ts` with pino logger. Add request/response logging middleware for all API endpoints.

**Files:** `api/server.ts`
**Dependency:** `pino`

---

## 2. Idle Timeout + Warning Banner

- Change `idleTimeout` from 120 to 200 in `api/server.ts`
- Frontend tracks elapsed time during article generation
- At ~170s (30s before timeout), show yellow warning banner: "Processing is taking longer than expected..."
- On connection drop, show error banner

**Files:** `api/server.ts`, `src/pages/ArticlePage.tsx`, `src/App.css`

---

## 3. Client-Side Caching (localStorage)

- Key: tweet URL → Value: `{ videoUrl, article, transcript, timestamp }`
- On URL submit, check localStorage first; if cached, skip API call
- Works for both Download and Article pages
- No expiration (user clears browser cache manually)

**Files:** `src/pages/DownloadPage.tsx`, `src/pages/ArticlePage.tsx`, new `src/utils/cache.ts`

---

## 4. Transcript Tab on Article Page

- After article generation, show two tabs: "Article" (default) and "Transcript"
- Article tab: current behavior (rendered markdown)
- Transcript tab: SRT-style static timestamps
  ```
  00:00:01 --> 00:00:05
  This is the first segment of speech

  00:00:06 --> 00:00:10
  And this continues here
  ```
- API must return raw transcript with timestamps in final SSE event

**Files:** `api/server.ts`, `src/pages/ArticlePage.tsx`, `src/components/TranscriptDisplay.tsx`, `src/App.css`

---

## 5. Twitter-Inspired UI Refresh

- System font stack: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto`
- Refine card styling: subtle borders, more whitespace
- Pill-shaped buttons, refined hover states
- Cleaner input borders, subtle focus states
- Smooth transitions on interactive elements
- Keep existing dark theme and color palette (already Twitter-like)
- Apply via frontend-design skill during implementation

**Files:** `src/index.css`, `src/App.css`, component files as needed

---

## 6. Pro Page + Sign-Up Flow

### Pro Page (`/pro`)
- Nav item: rightmost position, yellow crown icon, yellow text
- Hero section: "Unlock the full power of XDL"
- Price: $7.99/month
- Dummy feature list:
  - Batch processing — download multiple videos at once
  - Priority transcription — faster queue for article generation
  - Export formats — PDF, DOCX, and Markdown exports
  - Custom article styles — choose tone and format
  - History dashboard — access all previous downloads/articles
  - API access — programmatic access to all features
- CTA: "Sign Up for Pro" → navigates to `/pro/signup`

### Sign-Up Page (`/pro/signup`)
- Headline: "Pro features are coming soon! Tell us what you're most excited about."
- Checkboxes for each pro feature (user selects interests)
- Email input: "Enter your email to be notified when Pro launches"
- "Notify Me" button
- POST `/api/pro/signup` → appends `{ email, interests: [...], date }` to `api/data/signups.json`
- Success message: "Thanks! We'll notify you when Pro is ready."

**Files:**
- `src/pages/ProPage.tsx` (new)
- `src/pages/ProSignupPage.tsx` (new)
- `src/App.tsx` (add routes)
- `src/components/Nav.tsx` (add Pro link)
- `api/server.ts` (add `/api/pro/signup` endpoint)
- `api/data/signups.json` (created on first signup)
- `src/App.css` (Pro-specific styles)

---

## 7. E2E Tests

Add new test sections to existing `test-e2e.sh` (agent-browser):

1. **Pro page navigation** — nav link visible, page renders features and crown
2. **Pro sign-up flow** — navigate to signup, check checkboxes, enter email, submit, verify success
3. **Article tabs** — after article generation, verify Article and Transcript tabs exist and switch content
4. **Cached results** — submit same URL twice, verify second is instant (no loading state)
5. **Navigation includes Pro** — verify all three nav links present

**Files:** `test-e2e.sh`

---

## Decisions Made

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Caching | Client-side localStorage | Simple, no server persistence needed |
| UI approach | Twitter-inspired refresh | Keep layout, update visual language |
| E2E framework | agent-browser (existing) | Already set up in test-e2e.sh |
| Idle timeout | 200s with warning at 170s | User feedback before timeout |
| Transcript style | Static SRT | Simple display, no video player integration needed |
| Sign-up UX | Separate page | Simpler, testable, good navigation |
| Email storage | api/data/signups.json | Server-side, simple file storage |
