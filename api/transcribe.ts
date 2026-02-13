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
