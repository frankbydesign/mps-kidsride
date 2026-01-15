'use client';

import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import PendingApproval from './PendingApproval';

interface PendingApprovalWrapperProps {
  userEmail: string;
}

export default function PendingApprovalWrapper({ userEmail }: PendingApprovalWrapperProps) {
  const router = useRouter();

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  };

  return <PendingApproval userEmail={userEmail} onSignOut={handleSignOut} />;
}
