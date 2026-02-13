import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
import { Nav } from '../Nav';

describe('Nav', () => {
  it('renders Download and Article links', () => {
    render(
      <MemoryRouter>
        <Nav />
      </MemoryRouter>
    );
    expect(screen.getByText('Download')).toBeInTheDocument();
    expect(screen.getByText('Article')).toBeInTheDocument();
  });
});
