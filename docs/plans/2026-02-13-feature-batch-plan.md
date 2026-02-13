# XDL-Web Feature Batch Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add pino logging, idle timeout with warning, localStorage caching, transcript tabs, Twitter-inspired UI, Pro page with sign-up, and E2E tests.

**Architecture:** Backend changes in `api/server.ts` (pino, timeout, transcript endpoint changes). Frontend adds new pages (Pro, ProSignup), modifies ArticlePage for tabs, adds caching utility. All styling via CSS variables in existing files. E2E tests added to existing `test-e2e.sh`.

**Tech Stack:** React 19, Hono, Bun, Vite, pino, OpenAI Whisper (verbose_json), agent-browser (E2E)

---

### Task 1: Install pino and add API logging

**Files:**
- Modify: `api/server.ts`
- Modify: `package.json`

**Step 1: Install pino**

Run: `cd /Users/robray/xdl-web && bun add pino`

**Step 2: Replace console calls with pino in `api/server.ts`**

Add import at top of file:
```typescript
import pino from 'pino';

const logger = pino({ name: 'xdl-api' });
```

Replace all logging calls:
- `console.error('Error: ffmpeg...')` → `logger.fatal('ffmpeg is not installed or not on PATH. Install with: brew install ffmpeg')`
- `console.error('Error: Playwright...')` → `logger.fatal('Playwright Chromium not installed. Install with: bunx playwright install chromium')`
- `console.warn('Warning: OPENAI_API_KEY...')` → `logger.warn('OPENAI_API_KEY is not set. /api/article endpoint will not work.')`
- `console.warn('Warning: ANTHROPIC_API_KEY...')` → `logger.warn('ANTHROPIC_API_KEY is not set. /api/article endpoint will not work.')`
- `console.log(...)` at bottom → `logger.info(\`API server running on http://localhost:${PORT}\`)`

Add request logging middleware after `app.use('*', cors())`:
```typescript
app.use('*', async (c, next) => {
  const start = Date.now();
  await next();
  logger.info({ method: c.req.method, path: c.req.path, status: c.res.status, ms: Date.now() - start }, 'request');
});
```

**Step 3: Verify server starts**

Run: `cd /Users/robray/xdl-web && timeout 5 bun run api/server.ts 2>&1 || true`
Expected: Pino JSON log output with server startup message

**Step 4: Commit**

```bash
git add package.json bun.lock api/server.ts
git commit -m "feat: replace console logging with pino in API server"
```

---

### Task 2: Update idle timeout to 200s

**Files:**
- Modify: `api/server.ts`

**Step 1: Change idleTimeout**

Note: The current server uses Hono with Bun's default export. The `idleTimeout` is not currently set explicitly in the export. Add it:

Change the default export at bottom of `api/server.ts`:
```typescript
export default {
  port: PORT,
  fetch: app.fetch,
  idleTimeout: 200,
};
```

**Step 2: Commit**

```bash
git add api/server.ts
git commit -m "feat: increase idle timeout to 200 seconds"
```

---

### Task 3: Modify transcription to return timestamps

**Files:**
- Modify: `api/transcribe.ts`
- Modify: `api/server.ts`

**Step 1: Update `transcribeAudio` to return segments with timestamps**

Replace `api/transcribe.ts` with:
```typescript
import OpenAI from 'openai';
import { readFileSync } from 'node:fs';

const openai = new OpenAI();

export interface TranscriptSegment {
  start: number;
  end: number;
  text: string;
}

export interface TranscriptResult {
  text: string;
  segments: TranscriptSegment[];
}

/**
 * Transcribe an audio file using OpenAI Whisper.
 * Returns full text and timestamped segments.
 */
export async function transcribeAudio(audioPath: string): Promise<TranscriptResult> {
  const file = new File(
    [readFileSync(audioPath)],
    'audio.wav',
    { type: 'audio/wav' }
  );

  const response = await openai.audio.transcriptions.create({
    model: 'whisper-1',
    file,
    response_format: 'verbose_json',
  });

  const segments: TranscriptSegment[] = (response.segments ?? []).map((seg) => ({
    start: seg.start,
    end: seg.end,
    text: seg.text.trim(),
  }));

  return { text: response.text, segments };
}
```

**Step 2: Update `api/server.ts` to pass transcript through SSE**

In the `/api/article` handler, after transcription (line ~156), the `transcript` variable is now a `TranscriptResult` object. Update the `generateArticle` call to pass `transcript.text` instead of `transcript`:

```typescript
// Step 3: Transcribe
await stream.writeSSE({ event: 'stage', data: JSON.stringify('transcribing') });
const transcript = await transcribeAudio(audioPath);

// Step 4: Generate article (streaming)
await stream.writeSSE({ event: 'stage', data: JSON.stringify('writing') });
for await (const chunk of generateArticle(transcript.text, tweetInfo)) {
  await stream.writeSSE({ event: 'chunk', data: JSON.stringify(chunk) });
}

await stream.writeSSE({ event: 'done', data: JSON.stringify({ transcript: transcript.segments }) });
```

Note: The `done` event now sends the transcript segments as data instead of an empty string.

**Step 3: Commit**

```bash
git add api/transcribe.ts api/server.ts
git commit -m "feat: return timestamped transcript segments from Whisper API"
```

---

### Task 4: Add localStorage caching utility

**Files:**
- Create: `src/utils/cache.ts`

**Step 1: Create the cache utility**

```typescript
const CACHE_PREFIX = 'xdl-cache:';

interface DownloadCacheEntry {
  type: 'download';
  message: string;
  timestamp: number;
}

interface ArticleCacheEntry {
  type: 'article';
  article: string;
  transcript: { start: number; end: number; text: string }[];
  timestamp: number;
}

type CacheEntry = DownloadCacheEntry | ArticleCacheEntry;

function getKey(url: string, type: 'download' | 'article'): string {
  return `${CACHE_PREFIX}${type}:${url}`;
}

export function getCached(url: string, type: 'download' | 'article'): CacheEntry | null {
  try {
    const raw = localStorage.getItem(getKey(url, type));
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setCache(url: string, entry: CacheEntry): void {
  try {
    localStorage.setItem(getKey(url, entry.type), JSON.stringify(entry));
  } catch {
    // localStorage full or unavailable — silently ignore
  }
}
```

**Step 2: Commit**

```bash
git add src/utils/cache.ts
git commit -m "feat: add localStorage caching utility for download and article results"
```

---

### Task 5: Integrate caching into DownloadPage

**Files:**
- Modify: `src/pages/DownloadPage.tsx`

**Step 1: Add cache check before API call**

Add import:
```typescript
import { getCached, setCache } from '../utils/cache';
```

In `handleDownload`, before the `fetch` call, add:
```typescript
const cached = getCached(url, 'download');
if (cached && cached.type === 'download') {
  setStatus('success');
  setMessage(cached.message);
  return;
}
```

After the successful download (after `setMessage('Video downloaded successfully!')`), add:
```typescript
setCache(url, { type: 'download', message: 'Video downloaded successfully!', timestamp: Date.now() });
```

Note: For downloads, we only cache the success state (the user already has the file). Re-submitting the same URL will show "success" instantly but won't re-download the file.

**Step 2: Verify dev server works**

Run: `cd /Users/robray/xdl-web && bun run dev:frontend &` then check http://localhost:5173 loads

**Step 3: Commit**

```bash
git add src/pages/DownloadPage.tsx
git commit -m "feat: add localStorage caching to DownloadPage"
```

---

### Task 6: Add transcript tab and caching to ArticlePage

**Files:**
- Create: `src/components/TranscriptDisplay.tsx`
- Modify: `src/pages/ArticlePage.tsx`
- Modify: `src/App.css`

**Step 1: Create TranscriptDisplay component**

Create `src/components/TranscriptDisplay.tsx`:
```typescript
interface Segment {
  start: number;
  end: number;
  text: string;
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

interface TranscriptDisplayProps {
  segments: Segment[];
}

export function TranscriptDisplay({ segments }: TranscriptDisplayProps) {
  return (
    <div className="transcript-display">
      {segments.map((seg, i) => (
        <div key={i} className="transcript-segment">
          <span className="transcript-timestamp">
            {formatTime(seg.start)} {'-->'} {formatTime(seg.end)}
          </span>
          <p className="transcript-text">{seg.text}</p>
        </div>
      ))}
    </div>
  );
}
```

**Step 2: Add CSS for transcript and tabs**

Add to `src/App.css` before the responsive section:
```css
/* ── Tabs ── */
.tabs {
  display: flex;
  gap: 0;
  margin-top: 1.5rem;
  border-bottom: 1px solid var(--border);
}

.tab-btn {
  padding: 0.75rem 1.25rem;
  font-size: 0.9rem;
  font-weight: 600;
  font-family: inherit;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  color: var(--text-secondary);
  cursor: pointer;
  transition: color 0.2s, border-color 0.2s;
}

.tab-btn:hover {
  color: var(--text-primary);
}

.tab-btn.active {
  color: var(--accent);
  border-bottom-color: var(--accent);
}

/* ── Transcript ── */
.transcript-display {
  margin-top: 1rem;
  padding: 1.5rem;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  font-family: 'SF Mono', 'Fira Code', 'Fira Mono', monospace;
  font-size: 0.85rem;
  max-height: 500px;
  overflow-y: auto;
}

.transcript-segment {
  margin-bottom: 1.25rem;
}

.transcript-timestamp {
  color: var(--accent);
  font-size: 0.8rem;
  display: block;
  margin-bottom: 0.25rem;
}

.transcript-text {
  color: var(--text-primary);
  line-height: 1.6;
  margin: 0;
}

/* ── Timeout Warning Banner ── */
.timeout-warning {
  margin-top: 1rem;
  padding: 0.75rem 1rem;
  background: rgba(227, 179, 65, 0.12);
  border: 1px solid rgba(227, 179, 65, 0.3);
  border-radius: var(--radius);
  color: #e3b341;
  font-size: 0.85rem;
  font-weight: 500;
  animation: slideIn 0.25s ease-out;
}
```

**Step 3: Update ArticlePage with tabs, caching, and timeout warning**

Rewrite `src/pages/ArticlePage.tsx`:
```typescript
import { useState, useRef, useEffect } from 'react';
import { TweetInputForm } from '../components/TweetInputForm';
import { ProgressSteps } from '../components/ProgressSteps';
import { ArticleDisplay } from '../components/ArticleDisplay';
import { TranscriptDisplay } from '../components/TranscriptDisplay';
import { getCached, setCache } from '../utils/cache';

type ArticleStep = 'downloading' | 'extracting_audio' | 'transcribing' | 'writing' | 'done' | 'error';
type PageStep = ArticleStep | 'idle';
type Tab = 'article' | 'transcript';

interface TranscriptSegment {
  start: number;
  end: number;
  text: string;
}

export function ArticlePage() {
  const [step, setStep] = useState<PageStep>('idle');
  const [article, setArticle] = useState('');
  const [transcript, setTranscript] = useState<TranscriptSegment[]>([]);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('article');
  const [showTimeoutWarning, setShowTimeoutWarning] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentUrlRef = useRef('');

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleSubmit = async (url: string) => {
    // Check cache first
    const cached = getCached(url, 'article');
    if (cached && cached.type === 'article') {
      setArticle(cached.article);
      setTranscript(cached.transcript);
      setStep('done');
      setActiveTab('article');
      setError('');
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    currentUrlRef.current = url;

    setStep('downloading');
    setArticle('');
    setTranscript([]);
    setError('');
    setCopied(false);
    setActiveTab('article');
    setShowTimeoutWarning(false);

    // Start timeout warning timer (170s)
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setShowTimeoutWarning(true), 170_000);

    try {
      const res = await fetch('/api/article', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Request failed');
        setStep('error');
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) {
        setError('No response stream');
        setStep('error');
        return;
      }

      const decoder = new TextDecoder();
      let buffer = '';
      let fullArticle = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        let currentEvent = '';
        for (const line of lines) {
          if (line.startsWith('event: ')) {
            currentEvent = line.slice(7).trim();
          } else if (line.startsWith('data: ')) {
            const data = JSON.parse(line.slice(6));
            if (currentEvent === 'stage') {
              setStep(data as ArticleStep);
            } else if (currentEvent === 'chunk') {
              fullArticle += data;
              setArticle(prev => prev + data);
            } else if (currentEvent === 'done') {
              if (data && data.transcript) {
                setTranscript(data.transcript);
                // Cache the result
                setCache(currentUrlRef.current, {
                  type: 'article',
                  article: fullArticle,
                  transcript: data.transcript,
                  timestamp: Date.now(),
                });
              }
              setStep('done');
            } else if (currentEvent === 'error') {
              setError(data);
              setStep('error');
            }
            currentEvent = '';
          }
        }
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      setError(err instanceof Error ? err.message : 'Network error');
      setStep('error');
    } finally {
      if (timerRef.current) clearTimeout(timerRef.current);
      setShowTimeoutWarning(false);
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(article);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isProcessing = step !== 'idle' && step !== 'done' && step !== 'error';

  return (
    <>
      <header>
        <h1>x-dl</h1>
        <p className="subtitle">Video to Article</p>
      </header>

      <main>
        <TweetInputForm
          onSubmit={handleSubmit}
          isLoading={isProcessing}
          placeholder="Paste a video tweet URL..."
          buttonText="Generate"
        />

        {step !== 'idle' && step !== 'error' && (
          <ProgressSteps currentStep={step === 'done' ? 'done' : step as ArticleStep} />
        )}

        {showTimeoutWarning && isProcessing && (
          <div className="timeout-warning">
            Processing is taking longer than expected. Please wait...
          </div>
        )}

        {step === 'error' && (
          <div className="status status-error">
            <p>{error}</p>
          </div>
        )}

        {(step === 'writing' || step === 'done') && article && (
          <>
            {step === 'done' && transcript.length > 0 && (
              <div className="tabs">
                <button
                  className={`tab-btn ${activeTab === 'article' ? 'active' : ''}`}
                  onClick={() => setActiveTab('article')}
                >
                  Article
                </button>
                <button
                  className={`tab-btn ${activeTab === 'transcript' ? 'active' : ''}`}
                  onClick={() => setActiveTab('transcript')}
                >
                  Transcript
                </button>
              </div>
            )}

            {activeTab === 'article' && (
              <div style={{ position: 'relative' }}>
                <ArticleDisplay article={article} />
                <button
                  onClick={handleCopy}
                  className="copy-btn"
                  style={{
                    position: 'absolute',
                    top: '0.5rem',
                    right: '0.5rem',
                    padding: '0.4rem 0.8rem',
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                  }}
                >
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            )}

            {activeTab === 'transcript' && transcript.length > 0 && (
              <TranscriptDisplay segments={transcript} />
            )}
          </>
        )}
      </main>
    </>
  );
}
```

**Step 4: Verify the frontend compiles**

Run: `cd /Users/robray/xdl-web && bunx vite build 2>&1 | tail -5`
Expected: Build succeeds

**Step 5: Commit**

```bash
git add src/components/TranscriptDisplay.tsx src/pages/ArticlePage.tsx src/App.css
git commit -m "feat: add transcript tab with SRT timestamps and localStorage caching on ArticlePage"
```

---

### Task 7: Twitter-inspired UI refresh

**Files:**
- Modify: `src/index.css`
- Modify: `src/App.css`

> **For Claude:** Use the `frontend-design` skill when implementing this task for design guidance.

**Step 1: Update `src/index.css`**

The font stack is already correct. Update body to remove centering (let the app handle layout):

No changes needed — the existing CSS already uses `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto` and has a Twitter-like dark palette.

**Step 2: Update `src/App.css` for Twitter-inspired refinements**

Apply these targeted changes:

1. Make buttons pill-shaped — change `border-radius` on `.input-form button` from `calc(var(--radius) - 4px)` to `9999px`
2. Make nav links pill-shaped — change `.nav-link` border-radius from `6px` to `9999px`
3. Add `transition: all 0.2s ease` to `.status`, `.progress-steps`, `.article-display`
4. Increase `.app` max-width from `560px` to `600px` for more breathing room
5. Make `.copy-btn` a proper styled button — add to CSS:

```css
.copy-btn {
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  border: 1px solid var(--border);
  border-radius: 9999px;
  transition: background 0.2s, color 0.2s;
}

.copy-btn:hover {
  background: var(--bg-secondary);
  color: var(--text-primary);
}
```

**Step 3: Verify visual changes**

Run: `cd /Users/robray/xdl-web && bunx vite build 2>&1 | tail -5`
Expected: Build succeeds

**Step 4: Commit**

```bash
git add src/index.css src/App.css
git commit -m "feat: Twitter-inspired UI refresh with pill buttons and refined styling"
```

---

### Task 8: Create Pro page

**Files:**
- Create: `src/pages/ProPage.tsx`
- Modify: `src/App.css`

**Step 1: Create `src/pages/ProPage.tsx`**

```typescript
import { Link } from 'react-router-dom';

const PRO_FEATURES = [
  { name: 'Batch Processing', desc: 'Download multiple videos at once' },
  { name: 'Priority Transcription', desc: 'Faster queue for article generation' },
  { name: 'Export Formats', desc: 'PDF, DOCX, and Markdown exports' },
  { name: 'Custom Article Styles', desc: 'Choose tone and format for articles' },
  { name: 'History Dashboard', desc: 'Access all previous downloads and articles' },
  { name: 'API Access', desc: 'Programmatic access to all features' },
];

export function ProPage() {
  return (
    <>
      <header>
        <h1 className="pro-title">
          <svg className="crown-icon" width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
            <path d="M2.5 19h19v2h-19v-2zm19.57-9.36c-.21-.8-1.04-1.28-1.84-1.06l-3.67.97L13.3 4.2a1.4 1.4 0 0 0-2.6 0L7.44 9.55l-3.67-.97c-.8-.21-1.63.26-1.84 1.06-.11.4-.02.82.24 1.14L6.8 16h10.4l4.63-5.22c.26-.32.35-.74.24-1.14z"/>
          </svg>
          {' '}Pro
        </h1>
        <p className="subtitle">Unlock the full power of XDL</p>
      </header>

      <main>
        <div className="pro-price">
          <span className="pro-price-amount">$7.99</span>
          <span className="pro-price-period">/month</span>
        </div>

        <div className="pro-features">
          {PRO_FEATURES.map((feature) => (
            <div key={feature.name} className="pro-feature-card">
              <h3>{feature.name}</h3>
              <p>{feature.desc}</p>
            </div>
          ))}
        </div>

        <Link to="/pro/signup" className="pro-cta">
          Sign Up for Pro
        </Link>
      </main>
    </>
  );
}

export { PRO_FEATURES };
```

**Step 2: Add Pro styles to `src/App.css`**

Add before responsive section:
```css
/* ── Pro Page ── */
.pro-title {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  background: none;
  -webkit-background-clip: unset;
  -webkit-text-fill-color: #e3b341;
  background-clip: unset;
  color: #e3b341;
}

.crown-icon {
  color: #e3b341;
}

.pro-price {
  text-align: center;
  margin-bottom: 2rem;
}

.pro-price-amount {
  font-size: 2.5rem;
  font-weight: 800;
  color: #e3b341;
}

.pro-price-period {
  font-size: 1rem;
  color: var(--text-secondary);
}

.pro-features {
  display: grid;
  gap: 0.75rem;
  margin-bottom: 2rem;
}

.pro-feature-card {
  padding: 1rem 1.25rem;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  transition: border-color 0.2s;
}

.pro-feature-card:hover {
  border-color: rgba(227, 179, 65, 0.4);
}

.pro-feature-card h3 {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 0.25rem;
}

.pro-feature-card p {
  font-size: 0.85rem;
  color: var(--text-secondary);
  margin: 0;
}

.pro-cta {
  display: block;
  text-align: center;
  padding: 0.85rem 2rem;
  font-size: 1rem;
  font-weight: 700;
  background: #e3b341;
  color: #0d1117;
  text-decoration: none;
  border-radius: 9999px;
  transition: background 0.2s, transform 0.1s;
}

.pro-cta:hover {
  background: #f0c351;
  transform: translateY(-1px);
}

.pro-cta:active {
  transform: translateY(0);
}
```

**Step 3: Commit**

```bash
git add src/pages/ProPage.tsx src/App.css
git commit -m "feat: add Pro page with crown icon, features list, and CTA"
```

---

### Task 9: Create Pro sign-up page and API endpoint

**Files:**
- Create: `src/pages/ProSignupPage.tsx`
- Modify: `api/server.ts`
- Modify: `src/App.css`

**Step 1: Create `src/pages/ProSignupPage.tsx`**

```typescript
import { useState, type FormEvent } from 'react';
import { PRO_FEATURES } from './ProPage';

export function ProSignupPage() {
  const [email, setEmail] = useState('');
  const [interests, setInterests] = useState<string[]>([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const toggleInterest = (name: string) => {
    setInterests(prev =>
      prev.includes(name) ? prev.filter(i => i !== name) : [...prev, name]
    );
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setErrorMsg('');

    try {
      const res = await fetch('/api/pro/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, interests }),
      });

      if (!res.ok) {
        const data = await res.json();
        setErrorMsg(data.error || 'Signup failed');
        setStatus('error');
        return;
      }

      setStatus('success');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Network error');
      setStatus('error');
    }
  };

  if (status === 'success') {
    return (
      <>
        <header>
          <h1>x-dl</h1>
          <p className="subtitle">Pro Sign Up</p>
        </header>
        <main>
          <div className="signup-success">
            <h2>Thanks! We'll notify you when Pro is ready.</h2>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <header>
        <h1>x-dl</h1>
        <p className="subtitle">Pro Sign Up</p>
      </header>

      <main>
        <div className="signup-intro">
          <h2>Pro features are coming soon!</h2>
          <p>Tell us what you're most excited about.</p>
        </div>

        <form onSubmit={handleSubmit} className="signup-form">
          <div className="signup-interests">
            {PRO_FEATURES.map((feature) => (
              <label key={feature.name} className="signup-checkbox">
                <input
                  type="checkbox"
                  checked={interests.includes(feature.name)}
                  onChange={() => toggleInterest(feature.name)}
                />
                <span className="checkbox-label">
                  <strong>{feature.name}</strong> — {feature.desc}
                </span>
              </label>
            ))}
          </div>

          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email to be notified"
            className="signup-email"
            required
          />

          <button type="submit" className="pro-cta" disabled={status === 'loading'}>
            {status === 'loading' ? 'Submitting...' : 'Notify Me'}
          </button>

          {status === 'error' && (
            <div className="status status-error" style={{ marginTop: '1rem' }}>
              <p>{errorMsg}</p>
            </div>
          )}
        </form>
      </main>
    </>
  );
}
```

**Step 2: Add signup styles to `src/App.css`**

Add after Pro Page styles:
```css
/* ── Pro Sign-Up ── */
.signup-intro {
  text-align: center;
  margin-bottom: 1.5rem;
}

.signup-intro h2 {
  font-size: 1.3rem;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 0.25rem;
}

.signup-intro p {
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.signup-form {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.signup-interests {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.signup-checkbox {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  cursor: pointer;
  transition: border-color 0.2s;
}

.signup-checkbox:hover {
  border-color: rgba(227, 179, 65, 0.4);
}

.signup-checkbox input[type="checkbox"] {
  margin-top: 0.2rem;
  accent-color: #e3b341;
}

.checkbox-label {
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.checkbox-label strong {
  color: var(--text-primary);
}

.signup-email {
  padding: 0.75rem 1rem;
  font-size: 0.95rem;
  font-family: inherit;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--bg-secondary);
  color: var(--text-primary);
  outline: none;
  transition: border-color 0.2s;
}

.signup-email:focus {
  border-color: var(--accent);
}

.signup-email::placeholder {
  color: var(--text-secondary);
  opacity: 0.7;
}

.signup-success {
  text-align: center;
  padding: 2rem;
  background: var(--success-bg);
  border: 1px solid rgba(46, 160, 67, 0.2);
  border-radius: var(--radius);
}

.signup-success h2 {
  color: var(--success);
  font-size: 1.2rem;
}
```

**Step 3: Add `/api/pro/signup` endpoint to `api/server.ts`**

Add before the `export default` at end of file:
```typescript
// ── POST /api/pro/signup ──
app.post('/api/pro/signup', async (c) => {
  const body = await c.req.json<{ email: string; interests: string[] }>();
  const { email, interests } = body;

  if (!email || !email.includes('@')) {
    return c.json({ error: 'Valid email is required' }, 400);
  }

  const dataDir = new URL('./data', import.meta.url).pathname;
  const signupsPath = `${dataDir}/signups.json`;

  let signups: Array<{ email: string; interests: string[]; date: string }> = [];
  try {
    const file = Bun.file(signupsPath);
    if (await file.exists()) {
      signups = await file.json();
    }
  } catch {
    // File doesn't exist yet
  }

  signups.push({ email, interests: interests || [], date: new Date().toISOString() });

  await Bun.write(signupsPath, JSON.stringify(signups, null, 2));

  logger.info({ email, interests }, 'pro signup');
  return c.json({ success: true });
});
```

Also create the data directory:

Run: `mkdir -p /Users/robray/xdl-web/api/data`

Add `api/data/` to `.gitignore` (signups contain emails):
```
api/data/
```

**Step 4: Commit**

```bash
git add src/pages/ProSignupPage.tsx src/App.css api/server.ts .gitignore
git commit -m "feat: add Pro signup page with interest checkboxes and API endpoint"
```

---

### Task 10: Add routes and nav link for Pro

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/Nav.tsx`

**Step 1: Update `src/App.tsx` to add Pro routes**

```typescript
import { Routes, Route } from 'react-router-dom';
import { Nav } from './components/Nav';
import { DownloadPage } from './pages/DownloadPage';
import { ArticlePage } from './pages/ArticlePage';
import { ProPage } from './pages/ProPage';
import { ProSignupPage } from './pages/ProSignupPage';
import './App.css';

function App() {
  return (
    <div className="app">
      <Nav />
      <Routes>
        <Route path="/" element={<DownloadPage />} />
        <Route path="/article" element={<ArticlePage />} />
        <Route path="/pro" element={<ProPage />} />
        <Route path="/pro/signup" element={<ProSignupPage />} />
      </Routes>
    </div>
  );
}

export default App;
```

**Step 2: Update `src/components/Nav.tsx` to add Pro link with crown**

```typescript
import { NavLink } from 'react-router-dom';

export function Nav() {
  return (
    <nav className="nav">
      <div className="nav-brand">x-dl</div>
      <div className="nav-links">
        <NavLink to="/" end className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
          Download
        </NavLink>
        <NavLink to="/article" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
          Article
        </NavLink>
        <NavLink to="/pro" className={({ isActive }) => `nav-link nav-link-pro ${isActive ? 'active' : ''}`}>
          <svg className="crown-icon-sm" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M2.5 19h19v2h-19v-2zm19.57-9.36c-.21-.8-1.04-1.28-1.84-1.06l-3.67.97L13.3 4.2a1.4 1.4 0 0 0-2.6 0L7.44 9.55l-3.67-.97c-.8-.21-1.63.26-1.84 1.06-.11.4-.02.82.24 1.14L6.8 16h10.4l4.63-5.22c.26-.32.35-.74.24-1.14z"/>
          </svg>
          {' '}Pro
        </NavLink>
      </div>
    </nav>
  );
}
```

**Step 3: Add Pro nav link styles to `src/App.css`**

Add after `.nav-link.active`:
```css
.nav-link-pro {
  color: #e3b341 !important;
}

.nav-link-pro.active {
  background: rgba(227, 179, 65, 0.12) !important;
}

.crown-icon-sm {
  vertical-align: -2px;
}
```

**Step 4: Verify build**

Run: `cd /Users/robray/xdl-web && bunx vite build 2>&1 | tail -5`
Expected: Build succeeds

**Step 5: Commit**

```bash
git add src/App.tsx src/components/Nav.tsx src/App.css
git commit -m "feat: add Pro routes and yellow crown nav link"
```

---

### Task 11: Add E2E tests for new features

**Files:**
- Modify: `test-e2e.sh`

**Step 1: Add Pro page tests to `test-e2e.sh`**

Add before the `# ── Summary ──` section:

```bash
# ── Pro Page ──
section "Pro Page"

ab click "a[href='/pro']" >/dev/null
ab wait 1000 >/dev/null

assert_visible ".crown-icon" "crown icon is visible"
assert_text_contains "h1" "Pro" "Pro page heading"
assert_visible ".pro-features" "features list is visible"
assert_visible ".pro-cta" "signup CTA is visible"
assert_text_contains ".pro-price-amount" "7.99" "price shows $7.99"

section ""

# ── Pro Sign-Up Page ──
section "Pro Sign-Up Page"

ab click ".pro-cta" >/dev/null
ab wait 1000 >/dev/null

assert_visible ".signup-form" "signup form is visible"
assert_visible ".signup-interests" "interest checkboxes are visible"
assert_visible ".signup-email" "email input is visible"

# Check a feature checkbox
ab click ".signup-checkbox:first-child input" >/dev/null
ab fill ".signup-email" "test@example.com" >/dev/null
ab click ".pro-cta" >/dev/null
ab wait 2000 >/dev/null

assert_visible ".signup-success" "success message is visible"
assert_text_contains ".signup-success" "notify" "success says notify"

section ""

# ── Navigation includes Pro ──
section "Navigation (Pro)"

assert_visible "a[href='/pro']" "Pro nav link is visible"
assert_text_contains "a[href='/pro']" "Pro" "Pro nav link text"

section ""
```

**Step 2: Update the existing Navigation test section to also check for Pro link**

In the existing "Navigation" section, add after the article page nav test:
```bash
ab click "a[href='/pro']" >/dev/null
ab wait 500 >/dev/null
current_url=$(ab get url 2>/dev/null || echo "")
if echo "$current_url" | grep -q "/pro"; then
  pass "navigate to pro page"
else
  fail "navigate to pro page" "url is: $current_url" "a[href='/pro']"
fi
```

**Step 3: Update the Download Page section to check for Pro nav link**

In the "Download Page" section, add:
```bash
assert_visible "a[href='/pro']" "Pro nav link is visible"
```

**Step 4: Commit**

```bash
git add test-e2e.sh
git commit -m "test: add E2E tests for Pro page, signup flow, and navigation"
```

---

### Task 12: Final verification

**Step 1: Verify full build succeeds**

Run: `cd /Users/robray/xdl-web && bunx vite build`
Expected: Build succeeds with no errors

**Step 2: Verify API server starts**

Run: `cd /Users/robray/xdl-web && timeout 5 bun run api/server.ts 2>&1 || true`
Expected: Pino JSON log lines, server starts on port 3001

**Step 3: Run E2E tests (if dev server available)**

Run: `cd /Users/robray/xdl-web && bun run test:e2e`
Expected: All tests pass

**Step 4: Final commit if any cleanup needed**
