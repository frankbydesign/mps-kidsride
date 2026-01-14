import { createClient } from '@supabase/supabase-js';

let supabaseInstance: ReturnType<typeof createClient> | null = null;

export const supabase = (() => {
  if (!supabaseInstance) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

    if (!supabaseUrl || !supabaseAnonKey) {
      // Return a dummy client during build time
      return createClient('https://placeholder.supabase.co', 'placeholder-key');
    }

    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
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
  archived: boolean;
  last_message_at: string;
  last_volunteer_id: string | null;
  created_at: string;
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
