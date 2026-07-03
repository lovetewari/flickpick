import { describe, it, expect } from 'vitest';
import { normProvider, isValidLogoUrl } from '@/lib/constants';

// TMDB lists brand variants as separate providers — every variant must
// collapse to ONE display brand, or cards show duplicate logos side by side
// (the exact bug seen in production: two Apple TV marks on one card).
describe('normProvider — brand variant collapsing', () => {
  it.each([
    ['Apple TV', 'Apple TV+'],
    ['Apple TV Plus', 'Apple TV+'],
    ['Apple TV+', 'Apple TV+'],
    ['Apple TV Plus Amazon Channel', 'Apple TV+'],
    ['Amazon Prime Video', 'Prime Video'],
    ['Amazon Prime Video with Ads', 'Prime Video'],
    ['Amazon Video', 'Prime Video'],
    ['Netflix', 'Netflix'],
    ['Netflix basic with Ads', 'Netflix'],
    ['Netflix Standard with Ads', 'Netflix'],
    ['Disney Plus', 'Disney+'],
    ['Disney+ Hotstar', 'Hotstar'],
    ['JioHotstar', 'Hotstar'],
    ['HBO Max', 'Max'],
    ['Hulu', 'Hulu'],
  ])('%s → %s', (input, expected) => {
    expect(normProvider(input)).toBe(expected);
  });

  it('variants dedupe to a single brand entry', () => {
    const names = ['Apple TV+', 'Apple TV Plus Amazon Channel', 'Apple TV']
      .map(normProvider);
    expect(new Set(names).size).toBe(1);
  });
});

describe('isValidLogoUrl — only the TMDB image CDN passes', () => {
  it.each([
    ['https://image.tmdb.org/t/p/w45/abc.jpg', true],
    ['https://image.tmdb.org/t/p/w92/x-1.png', true],
    ['https://evil.example.com/steal.png', false],
    ['javascript:alert(1)', false],
    ['https://image.tmdb.org/t/p/w45/../../etc/passwd', false],
    ['', false],
    [null, false],
  ])('%s → %s', (input, expected) => {
    expect(isValidLogoUrl(input)).toBe(expected);
  });
});
