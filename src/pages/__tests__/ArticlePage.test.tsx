import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ArticlePage } from '../ArticlePage';

function makeSSEResponse(events: Array<{ event: string; data: string }>) {
  const body = events.map(e => `event: ${e.event}\ndata: ${JSON.stringify(e.data)}\n`).join('\n') + '\n';
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(body));
      controller.close();
    },
  });
  return new Response(stream, { status: 200, headers: { 'Content-Type': 'text/event-stream' } });
}

describe('ArticlePage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('advances progress steps and streams article chunks', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      makeSSEResponse([
        { event: 'stage', data: 'downloading' },
        { event: 'stage', data: 'extracting_audio' },
        { event: 'stage', data: 'transcribing' },
        { event: 'stage', data: 'writing' },
        { event: 'chunk', data: '# My ' },
        { event: 'chunk', data: 'Article' },
        { event: 'done', data: '' },
      ]),
    );

    render(<ArticlePage />);

    const input = screen.getByPlaceholderText(/video tweet/i);
    await userEvent.type(input, 'https://x.com/user/status/1');
    await userEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(screen.getByText('My Article')).toBeInTheDocument();
    });
  });

  it('shows error on failed request', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'Server error' }), { status: 500, headers: { 'Content-Type': 'application/json' } }),
    );

    render(<ArticlePage />);

    const input = screen.getByPlaceholderText(/video tweet/i);
    await userEvent.type(input, 'https://x.com/user/status/1');
    await userEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(screen.getByText('Server error')).toBeInTheDocument();
    });
  });

  it('shows error from SSE error event', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      makeSSEResponse([
        { event: 'stage', data: 'downloading' },
        { event: 'error', data: 'Extraction failed' },
      ]),
    );

    render(<ArticlePage />);

    const input = screen.getByPlaceholderText(/video tweet/i);
    await userEvent.type(input, 'https://x.com/user/status/1');
    await userEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(screen.getByText('Extraction failed')).toBeInTheDocument();
    });
  });
});
