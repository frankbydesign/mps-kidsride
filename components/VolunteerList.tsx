'use client';

import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Volunteer } from '@/lib/types';

interface VolunteerListProps {
  currentUserId: string;
  onVolunteerClick?: (volunteer: Volunteer) => void;
}

export default function VolunteerList({ currentUserId, onVolunteerClick }: VolunteerListProps) {
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);

  // Create singleton Supabase client to prevent AbortError from React Strict Mode
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    const fetchVolunteers = async () => {
      const { data, error } = await supabase
        .from('volunteers')
        .select('*')
        .order('display_name', { ascending: true });

      if (error) {
        console.error('Error fetching volunteers:', error);
      } else {
        setVolunteers(data || []);
      }
    };

    fetchVolunteers();

    // Subscribe to volunteer updates
    const subscription = supabase
      .channel('volunteers-presence')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'volunteers'
        },
        () => {
          fetchVolunteers();
        }
      )
      .subscribe();

    // Refresh every 30 seconds to update online status
    const interval = setInterval(fetchVolunteers, 30000);

    return () => {
      subscription.unsubscribe();
      clearInterval(interval);
    };
  }, [supabase]);

  const isOnline = (lastSeen: string | null) => {
    if (!lastSeen) return false;
    const lastSeenDate = new Date(lastSeen);
    const now = new Date();
    const diffMinutes = (now.getTime() - lastSeenDate.getTime()) / 60000;
    return diffMinutes < 3; // Online if seen in last 3 minutes
  };

  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-700 mb-3">
        Volunteers
      </h3>
      <div className="space-y-2">
        {volunteers.map((volunteer) => {
          const online = isOnline(volunteer.last_seen);
          const isCurrentUser = volunteer.id === currentUserId;

          return (
            <button
              key={volunteer.id}
              onClick={() => onVolunteerClick?.(volunteer)}
              className="flex items-center gap-2 w-full text-left hover:bg-gray-50 rounded px-2 py-1.5 -mx-2 transition-colors cursor-pointer"
              disabled={!onVolunteerClick}
            >
              <div
                className={`w-2 h-2 rounded-full ${
                  online ? 'bg-green-500' : 'bg-gray-300'
                }`}
              />
              <span className="text-sm text-gray-700">
                {volunteer.display_name || volunteer.email}
                {isCurrentUser && (
                  <span className="text-gray-500 ml-1">(you)</span>
                )}
              </span>
            </button>
          );
        })}
      </div>
      {volunteers.length === 0 && (
        <p className="text-sm text-gray-500">No volunteers yet</p>
      )}
    </div>
  );
}
