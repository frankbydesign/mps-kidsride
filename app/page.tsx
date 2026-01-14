import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import AuthForm from '@/components/AuthForm';
import PendingApproval from '@/components/PendingApproval';
import Dashboard from '@/components/Dashboard';

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

  // No user - show auth form
  if (!user) {
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
      <div className="flex h-screen items-center justify-center">
        <div className="text-gray-500">Error loading your profile. Please try signing in again.</div>
      </div>
    );
  }

  if (!volunteer) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-gray-500">Setting up your account...</div>
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
