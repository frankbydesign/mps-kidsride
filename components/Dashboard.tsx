'use client';

import { useState, useEffect, useMemo } from 'react';
import AdminApproval from '@/components/AdminApproval';
import ConversationList from '@/components/ConversationList';
import MessageView from '@/components/MessageView';
import VolunteerList from '@/components/VolunteerList';
import type { Volunteer } from '@/lib/types';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

interface DashboardProps {
  volunteer: Volunteer;
  userId: string;
}

export default function Dashboard({ volunteer, userId }: DashboardProps) {
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [showAdminApproval, setShowAdminApproval] = useState(false);
  const [pendingVolunteersCount, setPendingVolunteersCount] = useState(0);
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  };

  // Fetch and subscribe to pending volunteers count (admin only)
  useEffect(() => {
    if (!volunteer?.is_admin) {
      console.log('[Dashboard] User is not admin, skipping count fetch');
      return;
    }

    console.log('[Dashboard] Setting up pending volunteers count subscription');

    const fetchPendingCount = async () => {
      console.log('[Dashboard] Fetching pending volunteers count...');
      const { data, error } = await supabase
        .from('volunteers')
        .select('*')
        .eq('approved', false);

      console.log('[Dashboard] Query result - data:', data, 'error:', error);

      if (error) {
        console.error('[Dashboard] Error fetching count:', error);
        return;
      }

      const count = data?.length || 0;
      console.log('[Dashboard] Setting pending count to:', count);
      setPendingVolunteersCount(count);
    };

    // Fetch initial count
    fetchPendingCount();

    // Subscribe to real-time changes
    const channel = supabase
      .channel('volunteers-pending-count')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'volunteers',
        },
        () => {
          console.log('[Dashboard] Volunteers table changed, refetching count');
          // Refetch count when any volunteer record changes
          fetchPendingCount();
        }
      )
      .subscribe();

    // Cleanup subscription on unmount
    return () => {
      console.log('[Dashboard] Cleaning up subscription');
      supabase.removeChannel(channel);
    };
  }, [volunteer?.is_admin, supabase]);

  // Show admin approval interface if requested
  if (showAdminApproval && volunteer?.is_admin) {
    return <AdminApproval onClose={() => setShowAdminApproval(false)} />;
  }

  console.log('[Dashboard] Rendering - pendingVolunteersCount:', pendingVolunteersCount);

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-full md:w-80 lg:w-96 flex flex-col border-r border-gray-200 bg-white">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold text-gray-900">Ride Hotline</h1>
            <button
              onClick={handleSignOut}
              className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              Sign Out
            </button>
          </div>

          {/* Admin button */}
          {volunteer?.is_admin && (
            <button
              onClick={() => setShowAdminApproval(true)}
              className={`w-full mb-4 text-white py-2 px-4 rounded-lg font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors text-sm ${
                pendingVolunteersCount > 0
                  ? 'bg-red-500 hover:bg-red-600 focus:ring-red-500'
                  : 'bg-purple-600 hover:bg-purple-700 focus:ring-purple-500'
              }`}
            >
              Approve Volunteers{pendingVolunteersCount > 0 ? ` (${pendingVolunteersCount} pending)` : ''}
            </button>
          )}
        </div>

        {/* Conversation list */}
        <ConversationList
          userId={userId}
          selectedId={selectedConversationId}
          onSelect={setSelectedConversationId}
        />

        {/* Volunteer presence */}
        <div className="border-t border-gray-200 p-4">
          <VolunteerList currentUserId={userId} />
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col">
        {selectedConversationId ? (
          <MessageView
            conversationId={selectedConversationId}
            userId={userId}
            onBack={() => setSelectedConversationId(null)}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
              <p className="mt-4 text-lg">Select a conversation</p>
              <p className="mt-2 text-sm">Choose a conversation to view messages</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
