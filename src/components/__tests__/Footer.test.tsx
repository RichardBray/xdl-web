import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Footer } from '../Footer';

describe('Footer', () => {
  it('renders author name with link', () => {
    render(<Footer />);
    const link = screen.getByText('Richard Oliver Bray');
    expect(link).toBeInTheDocument();
    expect(link.closest('a')).toHaveAttribute('href', 'https://x.com/RichOBray');
  });

  it('renders bug report mailto link', () => {
    render(<Footer />);
    const link = screen.getByText('Report a bug');
    expect(link.closest('a')).toHaveAttribute('href', expect.stringContaining('mailto:rich.bray@orva.studio'));
  });
});
