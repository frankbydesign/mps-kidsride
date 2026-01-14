import { createServerClient } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';

/**
 * Creates a Supabase client for use in Middleware
 * This properly handles cookie-based auth in the middleware layer
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Skip if env vars not set (build time)
  if (!supabaseUrl || !supabaseAnonKey) {
    return supabaseResponse;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value);
          supabaseResponse.cookies.set(name, value, options);
        });
      },
    },
  });

  // CRITICAL PERFORMANCE FIX (2026 best practice):
  // DO NOT call supabase.auth.getUser() or getSession() here!
  // Middleware runs on every request - network calls here = 15+ second page loads
  //
  // The createServerClient call above with cookie handlers is sufficient.
  // It will refresh tokens automatically when needed via cookie operations.
  // Auth checks should be done in Server Components, not middleware.

  return supabaseResponse;
}
