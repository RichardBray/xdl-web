import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DownloadPage } from '../DownloadPage';

describe('DownloadPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('downloads video as blob and triggers browser download', async () => {
    const blobUrl = 'blob:http://localhost/fake-blob';
    vi.spyOn(URL, 'createObjectURL').mockReturnValue(blobUrl);
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    const clickSpy = vi.fn();
    const removeSpy = vi.fn();
    const origCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tag: string, options?: ElementCreationOptions) => {
      const el = origCreateElement(tag, options);
      if (tag === 'a') {
        el.click = clickSpy;
        el.remove = removeSpy;
      }
      return el;
    });

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(new Blob(['video-data'], { type: 'video/mp4' }), {
        status: 200,
        headers: {
          'Content-Type': 'video/mp4',
          'Content-Disposition': 'attachment; filename="test.mp4"',
        },
      }),
    );

    render(<DownloadPage />);

    const input = screen.getByPlaceholderText(/twitter/i);
    await userEvent.type(input, 'https://x.com/user/status/1');
    await userEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(screen.getByText(/successfully/i)).toBeInTheDocument();
    });

    expect(URL.createObjectURL).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalled();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith(blobUrl);
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
