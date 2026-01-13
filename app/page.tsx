'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import AuthForm from '@/components/AuthForm';
import ConversationList from '@/components/ConversationList';
import MessageView from '@/components/MessageView';
import VolunteerList from '@/components/VolunteerList';
import type { User } from '@supabase/supabase-js';

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [showArchive, setShowArchive] = useState(false);

  useEffect(() => {
    // Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Update volunteer presence
  useEffect(() => {
    if (!user) return;

    const updatePresence = async () => {
      await supabase
        .from('volunteers')
        .update({ last_seen: new Date().toISOString() })
        .eq('id', user.id);
    };

    // Update immediately
    updatePresence();

    // Update every 30 seconds
    const interval = setInterval(updatePresence, 30000);

    return () => clearInterval(interval);
  }, [user]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSelectedConversationId(null);
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
