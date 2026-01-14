import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Auth callback route handler for OAuth and magic link flows
 * Exchanges the authorization code for a user session
 */
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') ?? '/';
  const origin = requestUrl.origin;

  if (code) {
    const supabase = await createClient();

    // Exchange the code for a session
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error('Auth callback error:', error);
      // Redirect to home with error message (home page will show auth form)
      return NextResponse.redirect(
        `${origin}/?error=${encodeURIComponent(error.message)}`
      );
    }

    // Successful authentication - redirect to the next URL or home
    return NextResponse.redirect(`${origin}${next}`);
  }

  // No code present - redirect to home
  return NextResponse.redirect(`${origin}/?error=No+authorization+code+provided`);
}
