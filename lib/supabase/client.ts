import { createBrowserClient } from '@supabase/ssr';
import type { CookieOptions } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          // Parse all cookies from document.cookie
          return document.cookie.split(';').map((cookie) => {
            const [name, ...valueParts] = cookie.trim().split('=');
            const value = valueParts.join('=');
            return {
              name: name.trim(),
              value: decodeURIComponent(value || ''),
            };
          }).filter(cookie => cookie.name); // Filter out empty names
        },
        setAll(cookiesToSet) {
          // Set multiple cookies with proper options for PKCE flow
          cookiesToSet.forEach(({ name, value, options }) => {
            let cookie = `${name}=${encodeURIComponent(value)}`;

            if (options?.maxAge) {
              cookie += `; max-age=${options.maxAge}`;
            }
            if (options?.path) {
              cookie += `; path=${options.path}`;
            }
            if (options?.domain) {
              cookie += `; domain=${options.domain}`;
            }
            // Use SameSite=Lax to allow cookies on top-level navigations from email links
            // This is critical for magic links and PKCE flow to work
            if (options?.sameSite) {
              cookie += `; SameSite=${options.sameSite}`;
            } else {
              cookie += '; SameSite=Lax';
            }

            if (options?.secure !== false) {
              cookie += '; Secure';
            }

            document.cookie = cookie;
          });
        },
      },
    }
  );
}
