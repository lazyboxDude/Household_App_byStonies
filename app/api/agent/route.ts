import { NextResponse } from 'next/server';

const OWNER = 'lazyboxDude';
const REPO = 'Household_App_byStonies';

export async function POST(req: Request) {
  const token = req.headers.get('x-agent-token');
  const expected = process.env.AGENT_TRIGGER_TOKEN;
  if (!expected || token !== expected) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  // Try to dispatch GitHub Actions workflow if GITHUB_TOKEN is available
  const ghToken = process.env.GITHUB_TOKEN;
  if (!ghToken) {
    return NextResponse.json({ status: 'ok', note: 'No GITHUB_TOKEN configured; no remote dispatch performed' });
  }

  const url = `https://api.github.com/repos/${OWNER}/${REPO}/actions/workflows/ci.yml/dispatches`;
  const body = JSON.stringify({ ref: 'main', inputs: { triggered_by: 'agent-api' } });

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${ghToken}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json'
    },
    body
  });

  if (res.status >= 200 && res.status < 300) {
    return NextResponse.json({ status: 'dispatched' });
  }

  const text = await res.text();
  return new NextResponse(text || 'failed', { status: res.status });
}
