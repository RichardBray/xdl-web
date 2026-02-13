import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { streamSSE } from 'hono/streaming';
import { isValidTwitterUrl, parseTweetUrl, generateFilename } from 'x-dl/src/utils.ts';
import { VideoExtractor } from 'x-dl/src/extractor.ts';
import type { ExtractResult } from 'x-dl/src/types.ts';
import { extractAudio } from './audio.ts';
import { transcribeAudio } from './transcribe.ts';
import { generateArticle } from './article.ts';
import { unlink } from 'node:fs/promises';

// ── Startup dependency checks ──

async function checkDependencies() {
  const ffmpegResult = Bun.spawnSync(['which', 'ffmpeg']);
  if (ffmpegResult.exitCode !== 0) {
    console.error('Error: ffmpeg is not installed or not on PATH.');
    console.error('Install it with: brew install ffmpeg');
    process.exit(1);
  }

  try {
    const { chromium } = await import('playwright');
    const browser = await chromium.launch({ headless: true });
    await browser.close();
  } catch {
    console.error('Error: Playwright Chromium browser is not installed.');
    console.error('Install it with: bunx playwright install chromium');
    process.exit(1);
  }
}

await checkDependencies();

if (!process.env.OPENAI_API_KEY) {
  console.warn('Warning: OPENAI_API_KEY is not set. /api/article endpoint will not work.');
}
if (!process.env.ANTHROPIC_API_KEY) {
  console.warn('Warning: ANTHROPIC_API_KEY is not set. /api/article endpoint will not work.');
}

const app = new Hono();
app.use('*', cors());

// ── POST /api/download ──
app.post('/api/download', async (c) => {
  const body = await c.req.json<{ url: string }>();
  const tweetUrl = body.url;

  if (!tweetUrl || !isValidTwitterUrl(tweetUrl)) {
    return c.json({ error: 'Invalid or missing Twitter/X URL' }, 400);
  }

  const tweetInfo = parseTweetUrl(tweetUrl);
  const extractor = new VideoExtractor({ timeout: 30000 });
  let result: ExtractResult;

  try {
    result = await extractor.extract(tweetUrl);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Extraction failed';
    return c.json({ error: message }, 500);
  }

  if (result.error || !result.videoUrl) {
    return c.json(
      { error: result.error || 'Failed to extract video', errorClassification: result.errorClassification },
      422,
    );
  }

  const filename = tweetInfo ? generateFilename(tweetInfo) : 'video.mp4';

  if (result.videoUrl.format === 'm3u8') {
    // HLS playlist — remux to mp4 via ffmpeg
    const tmpFile = `/tmp/xdl-${Date.now()}-${Math.random().toString(36).slice(2)}.mp4`;
    const proc = Bun.spawn(
      ['ffmpeg', '-y', '-i', result.videoUrl.url, '-c', 'copy', '-bsf:a', 'aac_adtstoasc', tmpFile],
      { stdout: 'ignore', stderr: 'ignore' },
    );
    const exitCode = await proc.exited;
    if (exitCode !== 0) {
      await unlink(tmpFile).catch(() => {});
      return c.json({ error: 'ffmpeg remux failed' }, 500);
    }

    const file = Bun.file(tmpFile);
    c.header('Content-Type', 'video/mp4');
    c.header('Content-Disposition', `attachment; filename="${filename}"`);
    c.header('Content-Length', String(file.size));

    const body = file.stream();
    // Clean up temp file after response is sent
    const cleanup = () => unlink(tmpFile).catch(() => {});
    // Use a TransformStream to detect when streaming is done
    const { readable, writable } = new TransformStream();
    body.pipeTo(writable).then(cleanup, cleanup);

    return new Response(readable);
  }

  // Direct formats (mp4, webm, gif) — fetch and proxy
  const videoRes = await fetch(result.videoUrl.url);
  if (!videoRes.ok || !videoRes.body) {
    return c.json({ error: 'Failed to fetch video file' }, 502);
  }

  c.header('Content-Type', 'video/mp4');
  c.header('Content-Disposition', `attachment; filename="${filename}"`);
  if (videoRes.headers.get('content-length')) {
    c.header('Content-Length', videoRes.headers.get('content-length')!);
  }

  return new Response(videoRes.body);
});

// ── POST /api/article ──
app.post('/api/article', async (c) => {
  if (!process.env.OPENAI_API_KEY) {
    return c.json({ error: 'OPENAI_API_KEY is not configured on the server' }, 500);
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return c.json({ error: 'ANTHROPIC_API_KEY is not configured on the server' }, 500);
  }

  const body = await c.req.json<{ url: string }>();
  const tweetUrl = body.url;

  if (!tweetUrl || !isValidTwitterUrl(tweetUrl)) {
    return c.json({ error: 'Invalid or missing Twitter/X URL' }, 400);
  }

  const tweetInfo = parseTweetUrl(tweetUrl);

  return streamSSE(c, async (stream) => {
    const filesToClean: string[] = [];

    try {
      // Step 1: Extract video
      await stream.writeSSE({ event: 'stage', data: JSON.stringify('downloading') });
      const extractor = new VideoExtractor({ timeout: 30000 });
      const result: ExtractResult = await extractor.extract(tweetUrl);

      if (result.error || !result.videoUrl) {
        await stream.writeSSE({ event: 'error', data: JSON.stringify(result.error || 'Failed to extract video') });
        return;
      }

      // Step 2: Extract audio
      await stream.writeSSE({ event: 'stage', data: JSON.stringify('extracting_audio') });
      const audioPath = await extractAudio(result.videoUrl.url);
      filesToClean.push(audioPath);

      // Step 3: Transcribe
      await stream.writeSSE({ event: 'stage', data: JSON.stringify('transcribing') });
      const transcript = await transcribeAudio(audioPath);

      // Step 4: Generate article (streaming)
      await stream.writeSSE({ event: 'stage', data: JSON.stringify('writing') });
      for await (const chunk of generateArticle(transcript, tweetInfo)) {
        await stream.writeSSE({ event: 'chunk', data: JSON.stringify(chunk) });
      }

      await stream.writeSSE({ event: 'done', data: JSON.stringify('') });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      await stream.writeSSE({ event: 'error', data: JSON.stringify(message) });
    } finally {
      for (const f of filesToClean) {
        unlink(f).catch(() => {});
      }
    }
  });
});

const PORT = Number(process.env.API_PORT) || 3001;

export default {
  port: PORT,
  fetch: app.fetch,
};

console.log(`API server running on http://localhost:${PORT}`);
