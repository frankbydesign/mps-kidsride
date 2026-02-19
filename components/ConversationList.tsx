'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Conversation } from '@/lib/types';
import { getLanguageName } from '@/lib/languages';

// Extended type for conversation with joined volunteer data
interface ConversationWithVolunteer extends Conversation {
  volunteers?: { display_name: string };
}

type Tab = 'active' | 'resolved';

interface ConversationListProps {
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export default function ConversationList({
  selectedId,
  onSelect
}: ConversationListProps) {
  const [conversations, setConversations] = useState<ConversationWithVolunteer[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('active');

  // Create singleton Supabase client to prevent AbortError from React Strict Mode
  const supabase = useMemo(() => createClient(), []);

  const fetchConversations = useCallback(async (tab: Tab) => {
    let query = supabase
      .from('conversations')
      .select('*, volunteers:last_reply_by(display_name)');

    if (tab === 'resolved') {
      query = query.eq('status', 'resolved');
    } else {
      query = query.neq('status', 'resolved');
    }

    const { data, error } = await query
      .order('last_reply_at', { ascending: false, nullsFirst: false });

    if (error) {
      console.error('Error fetching conversations:', error);
    } else {
      setConversations(data || []);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchConversations(activeTab);

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
          fetchConversations(activeTab);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [activeTab, fetchConversations, supabase]);

  const handleResolve = async (id: string) => {
    const { error } = await supabase
      .from('conversations')
      .update({ status: 'resolved' } as never)
      .eq('id', id);

    if (error) {
      console.error('Error resolving conversation:', error);
    } else {
      fetchConversations(activeTab);
      if (selectedId === id) {
        onSelect('');
      }
    }
  };

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    setLoading(true);
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

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => handleTabChange('active')}
          className={`flex-1 py-2 px-4 text-sm font-medium text-center transition-colors ${
            activeTab === 'active'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Active
        </button>
        <button
          onClick={() => handleTabChange('resolved')}
          className={`flex-1 py-2 px-4 text-sm font-medium text-center transition-colors ${
            activeTab === 'resolved'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Resolved
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-gray-500">Loading...</div>
        </div>
      ) : conversations.length === 0 ? (
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center text-gray-500">
            {activeTab === 'active' ? (
              <>
                <p>No active conversations</p>
                <p className="text-sm mt-1">
                  Messages will appear here when parents text
                </p>
              </>
            ) : (
              <p>No resolved conversations</p>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          {conversations.map((conversation) => (
            <div
              key={conversation.id}
              className={`p-4 border-b border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors ${
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
                        {getLanguageName(conversation.detected_language)}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    {conversation.phone_number}
                  </p>
                  {conversation.volunteers && (
                    <p className="text-xs text-gray-400 mt-1">
                      Last reply: {conversation.volunteers.display_name}
                    </p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2 ml-2">
                  {conversation.last_reply_at && (
                    <span className="text-xs text-gray-500">
                      {formatTime(conversation.last_reply_at)}
                    </span>
                  )}
                  {activeTab === 'active' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleResolve(conversation.id);
                      }}
                      className="text-xs text-green-600 hover:text-green-800 transition-colors"
                    >
                      Resolve
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
