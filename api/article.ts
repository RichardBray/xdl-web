import Anthropic from '@anthropic-ai/sdk';
import type { TweetInfo } from 'x-dl/src/types.ts';

const anthropic = new Anthropic();

/**
 * Generate an article from a video transcript using Claude.
 */
export async function generateArticle(
  transcript: string,
  tweetInfo: TweetInfo | null
): Promise<string> {
  const context = tweetInfo
    ? `This is a transcript from a video posted on X/Twitter by @${tweetInfo.author} (${tweetInfo.url}).`
    : 'This is a transcript from a video posted on X/Twitter.';

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: `${context}

Here is the transcript:

${transcript}

Please write a well-structured article based on this transcript. The article should:
- Have a clear, engaging title
- Be written in a professional journalistic style
- Capture the key points and insights from the video
- Be well-organized with paragraphs
- Be concise but comprehensive

Return the article in Markdown format.`,
      },
    ],
  });

  const block = message.content[0];
  if (block.type !== 'text') {
    throw new Error('Unexpected response format from Claude');
  }

  return block.text;
}
