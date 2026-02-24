import { fetchContent } from '@/lib/tmdb';
export const dynamic = 'force-dynamic';

export async function GET(req) {
  try {
    const u = new URL(req.url);
    const contentType = u.searchParams.get('type') || 'all';
    const category = u.searchParams.get('category') || 'trending';
    const platforms = u.searchParams.get('platforms')?.split(',').filter(Boolean) || [];
    const genre = u.searchParams.get('genre') || 'All';
    const results = await fetchContent({ contentType, category, platforms, genre });
    return Response.json({ results, count: results.length });
  } catch (err) {
    console.error('TMDB error:', err);
    return Response.json({ error: err.message, results: [] }, { status: 500 });
  }
}
