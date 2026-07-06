import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';

/** Magic-link landing: exchanges the auth code for a session cookie, then redirects. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const next = url.searchParams.get('next') ?? '/';

  if (code) {
    try {
      const supabase = await createServerSupabase();
      await supabase.auth.exchangeCodeForSession(code);
    } catch {
      return NextResponse.redirect(new URL('/login', url.origin));
    }
  }
  return NextResponse.redirect(new URL(next, url.origin));
}
