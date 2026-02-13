import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';

/**
 * Extract audio from a video URL using ffmpeg.
 * Returns the path to the temporary .mp3 file.
 */
export async function extractAudio(videoUrl: string): Promise<string> {
  const outputPath = join(tmpdir(), `xdl-audio-${randomUUID()}.mp3`);

  const proc = Bun.spawn([
    'ffmpeg',
    '-i', videoUrl,
    '-vn',
    '-acodec', 'libmp3lame',
    '-q:a', '4',
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
