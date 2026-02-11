import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { StatusDisplay } from '../StatusDisplay';

describe('StatusDisplay', () => {
  it('returns null when idle', () => {
    const { container } = render(<StatusDisplay status="idle" />);
    expect(container.firstChild).toBeNull();
  });

  it('shows spinner when loading', () => {
    const { container } = render(<StatusDisplay status="loading" message="Loading..." />);
    expect(container.querySelector('.spinner')).toBeInTheDocument();
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('shows success message', () => {
    render(<StatusDisplay status="success" message="Done!" />);
    expect(screen.getByText('Done!')).toBeInTheDocument();
  });

  it('shows error message', () => {
    const { container } = render(<StatusDisplay status="error" message="Failed" />);
    expect(container.querySelector('.status-error')).toBeInTheDocument();
    expect(screen.getByText('Failed')).toBeInTheDocument();
  });
});
