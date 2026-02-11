import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { DownloadButton } from '../DownloadButton';

describe('DownloadButton', () => {
  it('renders format and filename', () => {
    render(<DownloadButton videoUrl="/video.mp4" filename="test.mp4" format="mp4" />);
    expect(screen.getByText('MP4')).toBeInTheDocument();
    expect(screen.getByText('test.mp4')).toBeInTheDocument();
  });

  it('renders download link with correct href', () => {
    render(<DownloadButton videoUrl="/video.mp4" filename="test.mp4" format="mp4" />);
    const link = screen.getByRole('link', { name: /download video/i });
    expect(link).toHaveAttribute('href', '/video.mp4');
    expect(link).toHaveAttribute('download', 'test.mp4');
  });
});
