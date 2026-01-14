'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface Conversation {
  id: string;
  phone_number: string;
  contact_name: string;
  last_message_at: string;
  archived: boolean;
  detected_language: string;
  last_volunteer_id: string | null;
  volunteers?: { name: string };
}

interface ConversationListProps {
  userId: string;
  selectedId: string | null;
  onSelect: (id: string) => void;
  showArchive: boolean;
}

export default function ConversationList({
  userId,
  selectedId,
  onSelect,
  showArchive
}: ConversationListProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchConversations();

    // Subscribe to conversation changes
    const subscription = supabase
      .channel('conversations')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations'
        },
        () => {
          fetchConversations();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [showArchive]);

  const fetchConversations = async () => {
    const { data, error } = await supabase
      .from('conversations')
      .select('*, volunteers:last_volunteer_id(name)')
      .eq('archived', showArchive)
      .order('last_message_at', { ascending: false });

    if (error) {
      console.error('Error fetching conversations:', error);
    } else {
      setConversations(data || []);
    }
    setLoading(false);
  };

  const handleArchiveToggle = async (id: string, currentArchived: boolean) => {
    const { error } = await (supabase
      .from('conversations') as any)
      .update({ archived: !currentArchived })
      .eq('id', id);

    if (error) {
      console.error('Error toggling archive:', error);
    } else {
      fetchConversations();
      if (selectedId === id) {
        onSelect('');
      }
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="text-center text-gray-500">
          <p>{showArchive ? 'No archived conversations' : 'No active conversations'}</p>
          <p className="text-sm mt-1">
            {!showArchive && "Messages will appear here when parents text"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {conversations.map((conversation) => (
        <div
          key={conversation.id}
          className={`p-4 border-b border-gray-200 cursor-pointer hover:bg-gray-50 ${
            selectedId === conversation.id ? 'bg-blue-50' : ''
          }`}
          onClick={() => onSelect(conversation.id)}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-gray-900 truncate">
                  {conversation.contact_name}
                </h3>
                {conversation.detected_language !== 'en' && (
                  <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
                    {conversation.detected_language.toUpperCase()}
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-500 mt-1">
                {conversation.phone_number}
              </p>
              {conversation.volunteers && (
                <p className="text-xs text-gray-400 mt-1">
                  Last reply: {conversation.volunteers.name}
                </p>
              )}
            </div>
            <div className="flex flex-col items-end gap-2 ml-2">
              <span className="text-xs text-gray-500">
                {formatTime(conversation.last_message_at)}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleArchiveToggle(conversation.id, conversation.archived);
                }}
                className="text-xs text-gray-600 hover:text-gray-900"
              >
                {conversation.archived ? 'Unarchive' : 'Archive'}
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
