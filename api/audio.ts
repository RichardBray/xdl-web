import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';

/**
 * Extract audio from a video URL using ffmpeg.
 * Returns the path to the temporary .wav file.
 */
export async function extractAudio(videoUrl: string): Promise<string> {
  const outputPath = join(tmpdir(), `xdl-audio-${randomUUID()}.wav`);

  const proc = Bun.spawn([
    'ffmpeg',
    '-i', videoUrl,
    '-vn',
    '-acodec', 'pcm_s16le',
    '-ar', '16000',
    '-ac', '1',
    '-y',
    outputPath,
  ], {
    stdout: 'ignore',
    stderr: 'pipe',
  });

  const exitCode = await proc.exited;
  if (exitCode !== 0) {
    const stderr = await new Response(proc.stderr).text();
    throw new Error(`ffmpeg audio extraction failed (exit ${exitCode}): ${stderr.slice(-500)}`);
  }

  return outputPath;
}
