import { describe, it, expect } from 'vitest';
import {
  genCode, genToken, CATEGORIES, LEGACY_CATEGORY, DECK_SIZES, SERIES_OFFSET,
  getCategoriesForType, CONTENT_TYPES, OTT_PLATFORMS, OTT_BG, GENRES, AVATARS, COLORS,
} from '@/lib/constants';

describe('genCode', () => {
  it('generates 6-char codes from the unambiguous alphabet', () => {
    for (let i = 0; i < 200; i++) {
      const c = genCode();
      expect(c).toMatch(/^[A-HJ-NP-Z2-9]{6}$/); // no I, O, 0, 1
      expect(c).not.toMatch(/[IO01]/);
    }
  });

  it('produces distinct codes across many draws', () => {
    const codes = new Set(Array.from({ length: 500 }, genCode));
    expect(codes.size).toBeGreaterThan(490);
  });
});

describe('genToken', () => {
  it('is prefixed and unique', () => {
    const a = genToken(), b = genToken();
    expect(a).toMatch(/^tok_/);
    expect(a).not.toBe(b);
  });
});

describe('categories', () => {
  it('exposes our six own categories with hot first', () => {
    expect(CATEGORIES.map(c => c.id)).toEqual(['hot', 'latest', 'hits', 'most_watched', 'top_rated', 'hidden_gems']);
  });

  it('returns the same categories for every content type', () => {
    expect(getCategoriesForType('movies')).toEqual(CATEGORIES);
    expect(getCategoriesForType('series')).toEqual(CATEGORIES);
    expect(getCategoriesForType('all')).toEqual(CATEGORIES);
  });

  it('maps every legacy TMDB-era id to a current category id', () => {
    const valid = new Set(CATEGORIES.map(c => c.id));
    for (const mapped of Object.values(LEGACY_CATEGORY)) expect(valid.has(mapped)).toBe(true);
    expect(LEGACY_CATEGORY.trending).toBe('hot');
    expect(LEGACY_CATEGORY.popular).toBe('most_watched');
  });
});

describe('deck sizes + id convention', () => {
  it('offers 10..50 in steps of 10', () => {
    expect(DECK_SIZES).toEqual([10, 20, 30, 40, 50]);
  });

  it('series offset is far above any realistic TMDB id', () => {
    expect(SERIES_OFFSET).toBe(100000000);
    // sanity: modern TMDB ids (~2M) can never collide with offset series ids
    expect(3000000 + 0).toBeLessThan(SERIES_OFFSET);
  });
});

describe('static config integrity', () => {
  it('content types cover movies/series/all', () => {
    expect(CONTENT_TYPES.map(t => t.id)).toEqual(['movies', 'series', 'all']);
  });

  it('every platform has a gradient in OTT_BG', () => {
    for (const p of OTT_PLATFORMS) expect(OTT_BG[p.name]).toBeTruthy();
  });

  it('genres start with All; avatars and colors are paired pools', () => {
    expect(GENRES[0]).toBe('All');
    expect(AVATARS.length).toBe(COLORS.length);
  });
});
