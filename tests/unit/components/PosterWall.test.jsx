// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import PosterWall from '@/components/PosterWall';

describe('PosterWall', () => {
  it('renders placeholder frames when no posters are provided', () => {
    const { container } = render(<PosterWall posters={[]} />);
    const frames = container.querySelectorAll('.pframe');
    expect(frames.length).toBeGreaterThan(0);
    expect(container.querySelectorAll('img').length).toBe(0);
  });

  it('renders <img> frames when posters exist and cycles through them', () => {
    const posters = ['https://img.example/a.jpg', 'https://img.example/b.jpg'];
    const { container } = render(<PosterWall posters={posters} />);
    const imgs = [...container.querySelectorAll('img')];
    expect(imgs.length).toBeGreaterThan(0);
    for (const img of imgs) expect(posters).toContain(img.src);
  });

  it('is decorative: hidden from assistive tech', () => {
    const { container } = render(<PosterWall posters={[]} />);
    expect(container.firstChild).toHaveAttribute('aria-hidden', 'true');
  });
});
