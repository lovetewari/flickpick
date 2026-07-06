import { describe, it, expect } from 'vitest';
import { normProvider, isValidLogoUrl, expandPlatforms } from '@/lib/constants';

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

// The reverse direction of normProvider: a canonical brand picked in the
// lobby must match every spelling the catalog may have stored, or the
// platform filter silently drops titles ("selected Prime Video, got less").
describe('expandPlatforms — canonical brand → every stored spelling', () => {
  it('expands Prime Video to Amazon variants', () => {
    const out = expandPlatforms(['Prime Video']);
    expect(out).toEqual(expect.arrayContaining([
      'Prime Video', 'Amazon Prime Video', 'Amazon Video', 'Amazon Prime Video with Ads',
    ]));
  });

  it('normalizes a variant input first, then expands (HBO Max → Max family)', () => {
    const out = expandPlatforms(['HBO Max']);
    expect(out).toEqual(expect.arrayContaining(['HBO Max', 'Max']));
  });

  it('covers Hotstar rebrands and ZEE5 casing', () => {
    expect(expandPlatforms(['Hotstar'])).toEqual(expect.arrayContaining(['Hotstar', 'Disney+ Hotstar', 'JioHotstar']));
    expect(expandPlatforms(['Zee5'])).toEqual(expect.arrayContaining(['ZEE5', 'Zee5']));
  });

  it('passes unknown platforms through untouched and dedupes', () => {
    const out = expandPlatforms(['MUBI', 'MUBI']);
    expect(out).toEqual(['MUBI']);
    expect(expandPlatforms([])).toEqual([]);
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
