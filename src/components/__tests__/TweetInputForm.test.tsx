import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { TweetInputForm } from '../TweetInputForm';

describe('TweetInputForm', () => {
  it('calls onSubmit with URL on form submit', async () => {
    const onSubmit = vi.fn();
    render(<TweetInputForm onSubmit={onSubmit} isLoading={false} />);

    const input = screen.getByPlaceholderText(/twitter/i);
    await userEvent.type(input, 'https://x.com/user/status/123');
    await userEvent.click(screen.getByRole('button'));

    expect(onSubmit).toHaveBeenCalledWith('https://x.com/user/status/123');
  });

  it('disables button when loading', () => {
    render(<TweetInputForm onSubmit={vi.fn()} isLoading={true} />);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('disables button when input is empty', () => {
    render(<TweetInputForm onSubmit={vi.fn()} isLoading={false} />);
    expect(screen.getByRole('button')).toBeDisabled();
  });
});
