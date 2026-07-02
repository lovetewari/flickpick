// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import TrendingStrip from '@/components/TrendingStrip';

const items = [
  { id: 1, title: 'Streamer', poster: 'x.jpg', year: 2024, type: 'movie', rating: 8, providers: ['Netflix'], providerLogos: ['https://img/nf.jpg'], inTheaters: false },
  { id: 2, title: 'Multi', poster: 'y.jpg', year: 2024, type: 'series', rating: 7, providers: ['Prime Video', 'Hotstar'], providerLogos: [null, null], inTheaters: false },
  { id: 3, title: 'Cinema', poster: 'z.jpg', year: 2026, type: 'movie', rating: 0, providers: [], providerLogos: [], inTheaters: true },
  { id: 4, title: 'Unknown', poster: 'w.jpg', year: 2020, type: 'series', rating: 6, providers: [], providerLogos: [], inTheaters: false },
];

describe('TrendingStrip availability tags', () => {
  it('renders the loading skeleton', () => {
    render(<TrendingStrip state="loading" items={[]} onRetry={() => {}} />);
    expect(screen.getByTestId('trending-skeleton')).toBeInTheDocument();
  });

  it('renders an error state with a working Retry', () => {
    const onRetry = vi.fn();
    render(<TrendingStrip state="error" items={[]} onRetry={onRetry} />);
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(onRetry).toHaveBeenCalled();
  });

  it('renders the empty state', () => {
    render(<TrendingStrip state="empty" items={[]} onRetry={() => {}} />);
    expect(screen.getByText('Trending list is warming up')).toBeInTheDocument();
  });

  it('renders REAL provider logos when available, glyph fallback otherwise, "In Theaters", type fallback', () => {
    render(<TrendingStrip state="ready" items={items} onRetry={() => {}} />);
    // Real logo → an <img alt="Netflix"> pointing at the logo url
    const nf = screen.getByAltText('Netflix');
    expect(nf.tagName).toBe('IMG');
    expect(nf).toHaveAttribute('src', 'https://img/nf.jpg');
    // No logo url → labelled glyph marks (not images)
    expect(screen.getByRole('img', { name: 'Prime Video' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Hotstar' })).toBeInTheDocument();
    expect(screen.queryByText('Prime Video')).toBeNull();      // never the spelled-out name
    expect(screen.getByRole('img', { name: 'In theaters' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Series' })).toBeInTheDocument(); // unknown → type fallback
    expect(screen.getByAltText('Streamer poster')).toBeInTheDocument();
  });
});
