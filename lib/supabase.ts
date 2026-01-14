import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

let supabaseInstance: SupabaseClient | null = null;

// Lazy initialization to avoid issues during build
export const supabase = (() => {
  if (typeof window === 'undefined') {
    // During SSR/build, return a dummy client
    return {} as SupabaseClient;
  }

  if (!supabaseInstance) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

    supabaseInstance = createBrowserClient(supabaseUrl, supabaseAnonKey);
  }

  return supabaseInstance;
})();

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
