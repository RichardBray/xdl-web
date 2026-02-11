# xdl-web

Web UI for [x-dl](https://github.com/robray/x-dl) — download tweets and generate articles from video.

## Prerequisites

- [Bun](https://bun.sh/) runtime
- [x-dl](../x-dl) package (linked locally or installed)
- `ffmpeg` on PATH (`brew install ffmpeg`)
- Playwright Chromium (`bunx playwright install chromium`)
- `OPENAI_API_KEY` and `ANTHROPIC_API_KEY` env vars (for article generation)

## Setup

```bash
bun install
```

## Development

Start both the Vite dev server and API server:

```bash
# Terminal 1: Frontend (port 5173)
bun run dev:frontend

# Terminal 2: API server (port 3001)
bun run dev:api
```

## How it works

The web app provides two features:

1. **Download** — Extract video URLs from Twitter/X posts
2. **Article** — Extract video, transcribe audio, and generate an article using AI

The API server imports core functionality from the `x-dl` package. On startup it verifies that ffmpeg and Playwright Chromium are available.
