'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

interface Volunteer {
  id: string;
  name: string;
  email: string;
  last_seen: string;
}

interface VolunteerListProps {
  currentUserId: string;
}

export default function VolunteerList({ currentUserId }: VolunteerListProps) {
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);

  useEffect(() => {
    const supabase = createClient();

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
  }, []);

  const fetchVolunteers = async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('volunteers')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching volunteers:', error);
    } else {
      setVolunteers(data || []);
    }
  };

  const isOnline = (lastSeen: string) => {
    const lastSeenDate = new Date(lastSeen);
    const now = new Date();
    const diffMinutes = (now.getTime() - lastSeenDate.getTime()) / 60000;
    return diffMinutes < 2; // Online if seen in last 2 minutes
  };

  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-700 mb-3">
        Volunteers Online
      </h3>
      <div className="space-y-2">
        {volunteers.map((volunteer) => {
          const online = isOnline(volunteer.last_seen);
          const isCurrentUser = volunteer.id === currentUserId;

          return (
            <div
              key={volunteer.id}
              className="flex items-center gap-2"
            >
              <div
                className={`w-2 h-2 rounded-full ${
                  online ? 'bg-green-500' : 'bg-gray-300'
                }`}
              />
              <span className="text-sm text-gray-700">
                {volunteer.name}
                {isCurrentUser && (
                  <span className="text-gray-500 ml-1">(you)</span>
                )}
              </span>
            </div>
          );
        })}
      </div>
      {volunteers.length === 0 && (
        <p className="text-sm text-gray-500">No volunteers yet</p>
      )}
    </div>
  );
}
