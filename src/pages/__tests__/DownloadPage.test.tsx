import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DownloadPage } from '../DownloadPage';

describe('DownloadPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('shows loading state then success with download button', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({
        videoUrl: '/videos/test.mp4',
        format: 'mp4',
        filename: 'test.mp4',
        tweetInfo: null,
      }), { status: 200, headers: { 'Content-Type': 'application/json' } }),
    );

    render(<DownloadPage />);

    const input = screen.getByPlaceholderText(/twitter/i);
    await userEvent.type(input, 'https://x.com/user/status/1');
    await userEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(screen.getByText(/successfully/i)).toBeInTheDocument();
    });

    expect(screen.getByRole('link', { name: /download video/i })).toHaveAttribute('href', '/videos/test.mp4');
  });

  it('shows error on failed request', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } }),
    );

    render(<DownloadPage />);

    const input = screen.getByPlaceholderText(/twitter/i);
    await userEvent.type(input, 'https://x.com/user/status/1');
    await userEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(screen.getByText('Not found')).toBeInTheDocument();
    });
  });
});
