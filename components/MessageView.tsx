'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';

interface Message {
  id: string;
  direction: 'inbound' | 'outbound';
  original_text: string;
  translated_text: string | null;
  detected_language: string;
  status: string;
  error_message: string | null;
  created_at: string;
  volunteer_id: string | null;
  volunteers?: { name: string };
}

interface Conversation {
  id: string;
  phone_number: string;
  contact_name: string;
  detected_language: string;
}

interface MessageViewProps {
  conversationId: string;
  userId: string;
  onBack: () => void;
}

export default function MessageView({
  conversationId,
  userId,
  onBack
}: MessageViewProps) {
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = createClient();

    fetchConversation();
    fetchMessages();

    // Subscribe to new messages
    const subscription = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        () => {
          fetchMessages();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [conversationId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchConversation = async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .single();

    if (error) {
      console.error('Error fetching conversation:', error);
    } else if (data) {
      setConversation(data as any);
      setEditedName((data as any).contact_name);
    }
  };

  const fetchMessages = async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('messages')
      .select('*, volunteers:volunteer_id(name)')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching messages:', error);
    } else {
      setMessages(data || []);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    setSending(true);

    try {
      const response = await fetch('/api/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId,
          message: newMessage.trim(),
          userId
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to send message');
      }

      setNewMessage('');
    } catch (error: any) {
      console.error('Send error:', error);
      alert(`Failed to send: ${error.message}`);
    } finally {
      setSending(false);
    }
  };

  const handleRetry = async (messageId: string) => {
    if (!conversation) return;

    const message = messages.find(m => m.id === messageId);
    if (!message) return;

    try {
      const response = await fetch('/api/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId,
          message: message.original_text,
          userId
        })
      });

      if (!response.ok) {
        throw new Error('Failed to retry');
      }

      // Delete the failed message
      const supabase = createClient();
      await supabase
        .from('messages')
        .delete()
        .eq('id', messageId);

      fetchMessages();
    } catch (error) {
      console.error('Retry error:', error);
      alert('Failed to retry message');
    }
  };

  const handleNameSave = async () => {
    if (!conversation || !editedName.trim()) return;

    const supabase = createClient();
    const { error } = await (supabase
      .from('conversations') as any)
      .update({ contact_name: editedName.trim() })
      .eq('id', conversationId);

    if (error) {
      console.error('Error updating name:', error);
    } else {
      setEditingName(false);
      fetchConversation();
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  if (!conversation) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="md:hidden text-gray-600 hover:text-gray-900"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <div className="flex-1">
            {editingName ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  className="flex-1 px-2 py-1 border border-gray-300 rounded"
                  autoFocus
                />
                <button
                  onClick={handleNameSave}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setEditingName(false);
                    setEditedName(conversation.contact_name);
                  }}
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-semibold text-gray-900">
                    {conversation.contact_name}
                  </h2>
                  <button
                    onClick={() => setEditingName(true)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                  {conversation.detected_language !== 'en' && (
                    <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
                      {conversation.detected_language.toUpperCase()}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500">{conversation.phone_number}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-xs lg:max-w-md ${message.direction === 'outbound' ? 'bg-blue-600 text-white' : 'bg-white text-gray-900'} rounded-lg px-4 py-2 shadow`}>
              <div className="break-words">
                {message.translated_text && message.direction === 'inbound' && (
                  <>
                    <p className="text-sm opacity-75 italic mb-1">
                      Original: {message.original_text}
                    </p>
                    <p>{message.translated_text}</p>
                  </>
                )}
                {message.translated_text && message.direction === 'outbound' && (
                  <>
                    <p>{message.original_text}</p>
                    <p className="text-sm opacity-75 italic mt-1">
                      Sent as: {message.translated_text}
                    </p>
                  </>
                )}
                {!message.translated_text && (
                  <p>{message.original_text}</p>
                )}
              </div>

              <div className={`flex items-center justify-between mt-1 text-xs ${message.direction === 'outbound' ? 'text-blue-100' : 'text-gray-500'}`}>
                <span>{formatTime(message.created_at)}</span>
                {message.direction === 'outbound' && (
                  <>
                    {message.status === 'failed' && (
                      <button
                        onClick={() => handleRetry(message.id)}
                        className="ml-2 text-red-200 hover:text-white underline"
                      >
                        Retry
                      </button>
                    )}
                    {message.status === 'sent' && <span className="ml-2">✓</span>}
                  </>
                )}
              </div>

              {message.volunteers && message.direction === 'outbound' && (
                <p className={`text-xs mt-1 ${message.direction === 'outbound' ? 'text-blue-200' : 'text-gray-400'}`}>
                  {message.volunteers.name}
                </p>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-200 bg-white p-4">
        <form onSubmit={handleSend} className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type in English..."
            disabled={sending}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={sending || !newMessage.trim()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sending ? 'Sending...' : 'Send'}
          </button>
        </form>
        {conversation.detected_language !== 'en' && (
          <p className="text-xs text-gray-500 mt-2">
            Your message will be translated to {conversation.detected_language.toUpperCase()}
          </p>
        )}
      </div>
    </div>
  );
}
