import { createClient } from '@supabase/supabase-js';

/**
 * Creates a Supabase admin client with service role key
 * This client has elevated privileges and should ONLY be used in secure server-side contexts
 * (API routes, server actions, etc.) - NEVER expose this to the client!
 *
 * We create a singleton instance to reuse across API requests for better performance
 */

let adminClient: ReturnType<typeof createClient> | null = null;

export function createAdminClient() {
  // Return existing instance if available (singleton pattern)
  if (adminClient) {
    return adminClient;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error(
      'Missing Supabase environment variables for admin client. Please check NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY'
    );
  }

  // Create admin client with service role key
  adminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return adminClient;
}
