// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import TrendingStrip from '@/components/TrendingStrip';

const items = [
  { id: 1, title: 'Streamer', poster: 'https://img/x.jpg', year: 2024, type: 'movie', rating: 8, providers: ['Netflix'], providerLogos: ['https://img/nf.jpg'], inTheaters: false, detailsUrl: 'https://example.com/streamer' },
  { id: 2, title: 'Multi', poster: 'https://img/y.jpg', year: 2024, type: 'series', rating: 7, providers: ['Prime Video', 'Hotstar'], providerLogos: [null, null], inTheaters: false, detailsUrl: 'https://example.com/multi' },
  { id: 3, title: 'Cinema', poster: 'https://img/z.jpg', year: 2026, type: 'movie', rating: 0, providers: ['Apple TV+'], providerLogos: ['https://img/atv.jpg'], inTheaters: false, detailsUrl: 'https://example.com/cinema' },
  { id: 4, title: 'Unknown', poster: 'https://img/w.jpg', year: 2020, type: 'series', rating: 6, providers: [], providerLogos: [], inTheaters: false, detailsUrl: 'https://example.com/unknown' },
  { id: 5, title: 'Cinema', poster: 'https://img/z.jpg', year: 2026, type: 'movie', rating: 0, providers: [], providerLogos: [], inTheaters: true, detailsUrl: 'https://example.com/theater' },
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

  it('falls back to the branded glyph when a real logo fails to load (validation)', () => {
    render(<TrendingStrip state="ready" items={[items[0]]} onRetry={() => {}} />);
    const logo = screen.getByAltText('Netflix');
    expect(logo.tagName).toBe('IMG');
    fireEvent.error(logo); // CDN 404 / blocked network
    expect(screen.queryByAltText('Netflix')).toBeNull();                       // broken img gone
    expect(screen.getByRole('img', { name: 'Netflix' })).toBeInTheDocument();  // glyph took its place
  });

  it('renders REAL provider logos when available, glyph fallback otherwise, "In Theaters", type fallback', () => {
    render(<TrendingStrip state="ready" items={items} onRetry={() => {}} />);
    expect(screen.getByLabelText('Rank 1')).toHaveTextContent('1');
    expect(screen.getByLabelText('Rank 2')).toHaveTextContent('2');
    expect(screen.getByLabelText('Rank 3')).toHaveTextContent('3');
    // Real logo → an <img alt="Netflix"> pointing at the logo url
    const nf = screen.getByAltText('Netflix');
    expect(nf.tagName).toBe('IMG');
    expect(nf).toHaveAttribute('src', 'https://img/nf.jpg');
    expect(screen.getByAltText('Apple TV+')).toHaveAttribute('src', 'https://img/atv.jpg');
    // No logo url → labelled glyph marks (not images)
    expect(screen.getByRole('img', { name: 'Prime Video' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Hotstar' })).toBeInTheDocument();
    expect(screen.queryByText('Prime Video')).toBeNull();      // never the spelled-out name
    expect(screen.getByRole('img', { name: 'In theaters' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Series' })).toBeInTheDocument(); // unknown → type fallback
    expect(screen.getByAltText('Streamer poster')).toBeInTheDocument();
  });

  it('opens a poster redirect dialog with stay and close controls', () => {
    render(<TrendingStrip state="ready" items={[items[0]]} onRetry={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'Open options for Streamer' }));

    expect(screen.getByRole('dialog', { name: 'Open Streamer' })).toBeInTheDocument();
    expect(screen.getByText('Trending #1')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Open title/ })).toHaveAttribute('href', 'https://example.com/streamer');

    fireEvent.click(screen.getByRole('button', { name: 'Stay here' }));
    expect(screen.queryByRole('dialog', { name: 'Open Streamer' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Open options for Streamer' }));
    fireEvent.click(screen.getByRole('button', { name: 'Close title options' }));
    expect(screen.queryByRole('dialog', { name: 'Open Streamer' })).toBeNull();
  });
});
