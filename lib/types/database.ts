// Database types matching supabase-schema.sql

// Enum types using TypeScript string literal unions
export type ConversationStatus = 'new' | 'active' | 'resolved';
export type MessageStatus = 'pending' | 'sent' | 'failed' | 'received' | 'superseded';
export type MessageDirection = 'inbound' | 'outbound';

// Volunteer table (links to Supabase Auth users)
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

// Conversation table (one per phone number that texts in)
export interface Conversation {
  id: string;
  phone_number: string;
  contact_name: string | null;
  detected_language: string;
  status: ConversationStatus;
  assigned_volunteer_id: string | null;
  last_reply_by: string | null;
  last_reply_at: string | null;
  created_at: string;
  updated_at: string;
}

// Message table
export interface Message {
  id: string;
  conversation_id: string | null;
  direction: MessageDirection;
  original_text: string;
  translated_text: string | null;
  detected_language: string | null;
  translation_error: string | null;
  status: MessageStatus;
  retry_count: number;
  volunteer_id: string | null;
  volunteer_name: string | null;
  twilio_sid: string | null;
  error_message: string | null;
  created_at: string;
}
