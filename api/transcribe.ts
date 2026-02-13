import OpenAI from 'openai';
import { readFileSync } from 'node:fs';

const openai = new OpenAI();

/**
 * Transcribe an audio file using OpenAI Whisper.
 */
export async function transcribeAudio(audioPath: string): Promise<string> {
  const file = new File(
    [readFileSync(audioPath)],
    'audio.wav',
    { type: 'audio/wav' }
  );

  const response = await openai.audio.transcriptions.create({
    model: 'whisper-1',
    file,
  });

  return response.text;
}
