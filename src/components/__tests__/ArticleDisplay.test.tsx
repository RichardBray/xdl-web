import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ArticleDisplay } from '../ArticleDisplay';

describe('ArticleDisplay', () => {
  it('renders headings from markdown', () => {
    render(<ArticleDisplay article="# Hello" />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Hello');
  });

  it('renders bold text', () => {
    const { container } = render(<ArticleDisplay article="**bold text**" />);
    expect(container.querySelector('strong')).toHaveTextContent('bold text');
  });

  it('renders links', () => {
    render(<ArticleDisplay article="[Click](https://example.com)" />);
    const link = screen.getByRole('link', { name: 'Click' });
    expect(link).toHaveAttribute('href', 'https://example.com');
  });

  it('renders list items', () => {
    const { container } = render(<ArticleDisplay article="- First item" />);
    const item = container.querySelector('li');
    expect(item).toBeInTheDocument();
    expect(item).toHaveTextContent('First item');
  });
});
