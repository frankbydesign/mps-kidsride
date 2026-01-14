'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import AuthForm from '@/components/AuthForm';
import PendingApproval from '@/components/PendingApproval';
import AdminApproval from '@/components/AdminApproval';
import ConversationList from '@/components/ConversationList';
import MessageView from '@/components/MessageView';
import VolunteerList from '@/components/VolunteerList';
import type { User } from '@supabase/supabase-js';
import type { Volunteer } from '@/lib/supabase';

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [volunteer, setVolunteer] = useState<Volunteer | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [showArchive, setShowArchive] = useState(false);
  const [showAdminApproval, setShowAdminApproval] = useState(false);

  useEffect(() => {
    // Check current session
    const loadSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);

      if (session?.user) {
        // Fetch volunteer profile with error handling
        const { data: volunteerData, error } = await supabase
          .from('volunteers')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (error) {
          console.error('Error fetching volunteer profile:', error);
          setVolunteer(null);
        } else {
          setVolunteer(volunteerData);
        }
      }

      setLoading(false);
    };

    loadSession();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null);

      if (session?.user) {
        // Fetch volunteer profile with error handling
        const { data: volunteerData, error } = await supabase
          .from('volunteers')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (error) {
          console.error('Error fetching volunteer profile:', error);
          setVolunteer(null);
        } else {
          setVolunteer(volunteerData);
        }
      } else {
        setVolunteer(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Update volunteer presence
  useEffect(() => {
    if (!user || !volunteer?.approved) return;

    const updatePresence = async () => {
      const { error } = await supabase
        .from('volunteers')
        .update({ last_seen: new Date().toISOString() })
        .eq('id', user.id);

      if (error) {
        console.error('Error updating presence:', error);
      }
    };

    // Update immediately
    updatePresence();

    // Update every 30 seconds
    const interval = setInterval(updatePresence, 30000);

    return () => clearInterval(interval);
  }, [user, volunteer]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setVolunteer(null);
    setSelectedConversationId(null);
    setShowAdminApproval(false);
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <AuthForm />;
  }

  // If volunteer record doesn't exist, show loading
  if (!volunteer) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-gray-500">Setting up your account...</div>
      </div>
    );
  }

  // Show pending approval screen if volunteer is not approved
  if (!volunteer.approved) {
    return <PendingApproval userEmail={user.email || ''} onSignOut={handleSignOut} />;
  }

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
            <button
              onClick={handleSignOut}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Sign Out
            </button>
          </div>

          {/* Admin button */}
          {volunteer?.is_admin && (
            <button
              onClick={() => setShowAdminApproval(true)}
              className="w-full mb-4 bg-purple-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-colors text-sm"
            >
              Approve Volunteers
            </button>
          )}

          {/* Archive toggle */}
          <div className="flex gap-2">
            <button
              onClick={() => setShowArchive(false)}
              className={`flex-1 py-2 px-3 rounded text-sm font-medium ${
                !showArchive
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Active
            </button>
            <button
              onClick={() => setShowArchive(true)}
              className={`flex-1 py-2 px-3 rounded text-sm font-medium ${
                showArchive
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Archive
            </button>
          </div>
        </div>

        {/* Conversation list */}
        <ConversationList
          userId={user.id}
          selectedId={selectedConversationId}
          onSelect={setSelectedConversationId}
          showArchive={showArchive}
        />

        {/* Volunteer presence */}
        <div className="border-t border-gray-200 p-4">
          <VolunteerList currentUserId={user.id} />
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col">
        {selectedConversationId ? (
          <MessageView
            conversationId={selectedConversationId}
            userId={user.id}
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
