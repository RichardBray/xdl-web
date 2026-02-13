import Anthropic from '@anthropic-ai/sdk';
import type { TweetInfo } from 'x-dl/src/types.ts';

const anthropic = new Anthropic();

const SYSTEM_PROMPT = `You are a skilled journalist. Write a well-structured article based on this video transcript. Maintain the speaker's key points and tone. Use clear headings, an engaging introduction, and a conclusion. Format in markdown.`;

/**
 * Generate an article from a video transcript using Claude (streaming).
 * Yields text chunks as they arrive.
 */
export async function* generateArticle(
  transcript: string,
  tweetInfo: TweetInfo | null
): AsyncGenerator<string> {
  const context = tweetInfo
    ? `Here is the transcript from a Twitter/X video by @${tweetInfo.author}:`
    : 'Here is the transcript from a Twitter/X video:';

  const stream = anthropic.messages.stream({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `${context}\n\n${transcript}\n\nPlease write a well-structured article based on this transcript.`,
      },
    ],
  });

  for await (const event of stream) {
    if (
      event.type === 'content_block_delta' &&
      event.delta.type === 'text_delta'
    ) {
      yield event.delta.text;
    }
  }
}
