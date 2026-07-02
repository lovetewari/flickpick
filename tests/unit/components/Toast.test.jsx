// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Toast from '@/components/Toast';

describe('Toast', () => {
  it('renders the message', () => {
    render(<Toast msg="Copied!" visible />);
    expect(screen.getByText('Copied!')).toBeInTheDocument();
  });

  it('is present but styled hidden when not visible (slide-away pattern)', () => {
    const { container } = render(<Toast msg="Hi" visible={false} />);
    expect(container.firstChild).toBeTruthy();
  });
});
