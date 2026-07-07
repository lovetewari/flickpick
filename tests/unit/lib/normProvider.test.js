import { describe, it, expect } from 'vitest';
import { normProvider, isValidLogoUrl, expandPlatforms, resolveLogo, BRAND_LOGOS } from '@/lib/constants';

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

describe('isValidLogoUrl — TMDB CDN or our own curated /logos passes', () => {
  it.each([
    ['https://image.tmdb.org/t/p/w45/abc.jpg', true],
    ['https://image.tmdb.org/t/p/w92/x-1.png', true],
    ['/logos/hotstar.svg', true],            // curated self-hosted brand logo
    ['/logos/sony-liv.svg', true],
    ['https://evil.example.com/steal.png', false],
    ['/logos/../../etc/passwd', false],      // no traversal
    ['/logos/evil.js', false],               // svg only
    ['javascript:alert(1)', false],
    ['https://image.tmdb.org/t/p/w45/../../etc/passwd', false],
    ['', false],
    [null, false],
  ])('%s → %s', (input, expected) => {
    expect(isValidLogoUrl(input)).toBe(expected);
  });
});

// TMDB serves JioHotstar as a broken square crop that reads "JioHot" — the
// curated override must win over any TMDB url for that brand, at every spelling.
describe('resolveLogo — curated overrides beat TMDB', () => {
  it('overrides Hotstar (and its variants) with the self-hosted mark', () => {
    expect(resolveLogo('Hotstar', 'https://image.tmdb.org/t/p/w154/jiohot.jpg')).toBe('/logos/hotstar.svg');
    expect(resolveLogo('JioHotstar', 'https://image.tmdb.org/t/p/w154/jiohot.jpg')).toBe('/logos/hotstar.svg');
    expect(resolveLogo('Disney+ Hotstar', null)).toBe('/logos/hotstar.svg');
    expect(BRAND_LOGOS.Hotstar).toBe('/logos/hotstar.svg');
  });

  it('passes a trusted TMDB url through untouched for non-overridden brands', () => {
    expect(resolveLogo('Netflix', 'https://image.tmdb.org/t/p/w154/nf.jpg')).toBe('https://image.tmdb.org/t/p/w154/nf.jpg');
  });

  it('returns empty for an untrusted url (caller falls back to a chip)', () => {
    expect(resolveLogo('Netflix', 'https://evil.example.com/x.png')).toBe('');
    expect(resolveLogo('Netflix', null)).toBe('');
  });
});
