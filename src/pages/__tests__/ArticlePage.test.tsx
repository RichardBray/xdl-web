import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ArticlePage } from '../ArticlePage';

function makeSSEResponse(events: string[]) {
  const body = events.join('\n') + '\n';
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

  it('advances progress steps and displays article on success', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      makeSSEResponse([
        'data: {"step":"extracting"}',
        'data: {"step":"extracting_audio"}',
        'data: {"step":"transcribing"}',
        'data: {"step":"generating"}',
        'data: {"step":"done","article":"# My Article"}',
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
});
