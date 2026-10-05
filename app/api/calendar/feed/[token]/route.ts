import { createClient } from '@supabase/supabase-js';
import { buildIcs, type FeedEvent } from '../../../../lib/ics';
import type { Database } from '../../../../lib/database.types';

// Public, login-free ICS subscription feed. Google/Apple/Outlook fetch this URL
// themselves, so the secret token in the path is the only credential. The token
// is resolved to a household inside the database (get_calendar_feed), which
// returns just that household's events — the anon key can't read the tables
// directly.

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const notFound = () =>
  new Response('Not found', { status: 404, headers: { 'Cache-Control': 'no-store' } });

export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  // Subscribers paste a URL ending in ".ics"; accept both forms.
  const token = (await params).token.replace(/\.ics$/i, '');
  if (!UUID_RE.test(token)) return notFound();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    return new Response('Calendar feed is not configured', { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }

  const supabase = createClient<Database>(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase.rpc('get_calendar_feed', { p_token: token });

  // A failed lookup must not look like "unknown token": calendar apps would
  // treat 404 as "feed deleted", so report a temporary error instead.
  if (error) {
    return new Response('Calendar feed temporarily unavailable', { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) return notFound();

  const feed = data as { name?: string; events?: FeedEvent[] };
  const ics = buildIcs({ name: feed.name ?? 'Household', events: feed.events ?? [] });

  return new Response(ics, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'inline; filename="household.ics"',
      // The URL is a secret: keep it out of shared caches and search indexes.
      'Cache-Control': 'private, max-age=300',
      'X-Robots-Tag': 'noindex, nofollow',
      'Referrer-Policy': 'no-referrer',
    },
  });
}
