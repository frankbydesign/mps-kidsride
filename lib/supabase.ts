import { createBrowserClient } from '@supabase/ssr';
import type { CookieOptions } from '@supabase/ssr';

// Create client once at module load time
// createBrowserClient from @supabase/ssr handles singleton pattern internally
// and is safe to call during SSR/build with placeholder values
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';

// Configure browser client with explicit cookie handlers to ensure PKCE code verifier
// is properly stored and retrieved for magic links
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey, {
  cookies: {
    getAll() {
      // Parse all cookies from document.cookie
      if (typeof document === 'undefined') return []; // SSR safety

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
      if (typeof document === 'undefined') return; // SSR safety

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
});

// Types for database tables
export interface Volunteer {
  id: string;
  email: string;
  name: string;
  display_name?: string;
  is_online?: boolean;
  approved: boolean;
  is_admin: boolean;
  last_seen: string;
  created_at: string;
}

export interface Conversation {
  id: string;
  phone_number: string;
  contact_name: string;
  detected_language: string;
  status: string;
  last_reply_at: string | null;
  last_reply_by: string | null;
  assigned_volunteer_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  volunteer_id: string | null;
  direction: 'inbound' | 'outbound';
  original_text: string;
  translated_text: string | null;
  detected_language: string;
  twilio_sid: string | null;
  status: 'received' | 'sent' | 'failed';
  error_message: string | null;
  created_at: string;
}
