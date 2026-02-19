'use client';

import { useState, useEffect, useMemo } from 'react';
import AdminApproval from '@/components/AdminApproval';
import ConversationList from '@/components/ConversationList';
import MessageView from '@/components/MessageView';
import VolunteerList from '@/components/VolunteerList';
import SettingsModal from '@/components/SettingsModal';
import VolunteerProfile from '@/components/VolunteerProfile';
import type { Volunteer } from '@/lib/types';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

interface DashboardProps {
  volunteer: Volunteer;
  userId: string;
}

export default function Dashboard({ volunteer, userId }: DashboardProps) {
  console.log('[Dashboard] Received volunteer prop:', JSON.stringify(volunteer, null, 2));
  console.log('[Dashboard] volunteer.is_admin:', volunteer?.is_admin);
  console.log('[Dashboard] typeof volunteer.is_admin:', typeof volunteer?.is_admin);

  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [showAdminApproval, setShowAdminApproval] = useState(false);
  const [pendingVolunteersCount, setPendingVolunteersCount] = useState(0);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [currentVolunteer, setCurrentVolunteer] = useState<Volunteer>(volunteer);
  const [selectedVolunteer, setSelectedVolunteer] = useState<Volunteer | null>(null);
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  // Update current volunteer when prop changes
  useEffect(() => {
    setCurrentVolunteer(volunteer);
  }, [volunteer]);

  // Heartbeat: Update last_seen every 60 seconds
  useEffect(() => {
    const updatePresence = async () => {
      const { error } = await supabase
        .from('volunteers')
        .update({ last_seen: new Date().toISOString() })
        .eq('id', userId);

      if (error) {
        console.error('Error updating presence:', error);
      }
    };

    // Update immediately on mount
    updatePresence();

    // Then update every 60 seconds
    const interval = setInterval(updatePresence, 60000);

    return () => {
      clearInterval(interval);
    };
  }, [userId, supabase]);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  };

  const handleVolunteerClick = (volunteer: Volunteer) => {
    // Toggle profile: close if clicking the same volunteer, open if different
    if (selectedVolunteer?.id === volunteer.id) {
      setSelectedVolunteer(null);
    } else {
      setSelectedVolunteer(volunteer);
    }
  };

  // Fetch and subscribe to pending volunteers count (admin only)
  useEffect(() => {
    console.log('[PendingCount useEffect] Running, volunteer.is_admin:', volunteer?.is_admin);
    if (!volunteer?.is_admin) return;
    console.log('[PendingCount useEffect] Passed admin check, fetching count...');

    const fetchPendingCount = async () => {
      const { data, error } = await supabase
        .from('volunteers')
        .select('*')
        .eq('approved', false);

      console.log('[PendingCount] Query result - data:', data, 'error:', error);

      if (error) {
        console.error('Error fetching pending volunteers count:', error);
        return;
      }

      const count = data?.length || 0;
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
          // Refetch count when any volunteer record changes
          fetchPendingCount();
        }
      )
      .subscribe();

    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, [volunteer?.is_admin, supabase]);

  // Show admin approval interface if requested
  if (showAdminApproval && volunteer?.is_admin) {
    return <AdminApproval onClose={() => setShowAdminApproval(false)} />;
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-full md:w-80 lg:w-96 flex flex-col border-r border-gray-200 bg-white">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold text-gray-900">Ride Hotline</h1>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsSettingsOpen(true)}
                className="text-gray-600 hover:text-gray-900 transition-colors"
                aria-label="Settings"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              </button>
              <button
                onClick={handleSignOut}
                className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                Sign Out
              </button>
            </div>
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
          selectedId={selectedConversationId}
          onSelect={setSelectedConversationId}
        />

        {/* Volunteer presence */}
        <div className="border-t border-gray-200 p-4">
          <VolunteerList
            currentUserId={userId}
            onVolunteerClick={handleVolunteerClick}
          />
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex">
        {/* Messages area */}
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

        {/* Volunteer Profile Panel */}
        <VolunteerProfile
          volunteer={selectedVolunteer}
          isOpen={selectedVolunteer !== null}
          onClose={() => setSelectedVolunteer(null)}
          onUpdate={(updated) => setSelectedVolunteer(updated)}
          currentUserId={userId}
          currentUserIsAdmin={currentVolunteer.is_admin}
        />
      </div>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        volunteer={currentVolunteer}
        onUpdate={(updatedVolunteer) => setCurrentVolunteer(updatedVolunteer)}
      />
    </div>
  );
}
