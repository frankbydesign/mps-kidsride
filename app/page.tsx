import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import AuthForm from '@/components/AuthForm';
import PendingApproval from '@/components/PendingApproval';
import Dashboard from '@/components/Dashboard';

// Force dynamic rendering to prevent caching of auth state
export const dynamic = 'force-dynamic';

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

export default async function Home() {
  const supabase = await createClient();

  // Check authentication using getClaims() per official Supabase pattern
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;

  // No user or missing sub claim - show auth form
  // Note: sub (subject) is a required JWT claim containing the user ID
  if (!user || !user.sub) {
    return <AuthForm />;
  }

  // Fetch volunteer profile
  const { data: volunteer, error } = await supabase
    .from('volunteers')
    .select('*')
    .eq('id', user.sub)
    .single();

  if (error) {
    console.error('Error fetching volunteer profile:', error);
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <svg
            className="mx-auto h-12 w-12 text-red-500 mb-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Error loading your profile
          </h2>
          <p className="text-sm text-gray-600 mb-6">
            {error.message || 'Please try signing in again'}
          </p>
          <button
            onClick={async () => {
              'use server';
              const supabase = await createClient();
              await supabase.auth.signOut();
              redirect('/');
            }}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
          >
            Sign out and try again
          </button>
        </div>
      </div>
    );
  }

  if (!volunteer) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Setting up your account...
          </h2>
          <p className="text-sm text-gray-600 mb-6">
            This should only take a few seconds
          </p>
          <button
            onClick={async () => {
              'use server';
              const supabase = await createClient();
              await supabase.auth.signOut();
              redirect('/');
            }}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            Taking too long? Click here to sign out and try again
          </button>
        </div>
      </div>
    );
  }

  // Show pending approval screen if volunteer is not approved
  if (!volunteer.approved) {
    return <PendingApproval userEmail={user.email || ''} onSignOut={async () => {
      'use server';
      const supabase = await createClient();
      await supabase.auth.signOut();
      redirect('/');
    }} />;
  }

  // Show dashboard
  return <Dashboard volunteer={volunteer as Volunteer} userId={user.sub} />;
}
