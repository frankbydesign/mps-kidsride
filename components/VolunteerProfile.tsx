'use client';

import type { Volunteer } from '@/lib/types';

interface VolunteerProfileProps {
  volunteer: Volunteer | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function VolunteerProfile({ volunteer, isOpen, onClose }: VolunteerProfileProps) {
  if (!isOpen || !volunteer) return null;

  // Check if volunteer is online (same logic as VolunteerList)
  const isOnline = (lastSeen: string | null) => {
    if (!lastSeen) return false;
    const lastSeenDate = new Date(lastSeen);
    const now = new Date();
    const diffMinutes = (now.getTime() - lastSeenDate.getTime()) / 60000;
    return diffMinutes < 3; // Online if seen in last 3 minutes
  };

  const online = isOnline(volunteer.last_seen);

  return (
    <>
      {/* Backdrop for mobile */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
        onClick={onClose}
      />

      {/* Sidebar Panel */}
      <div className="fixed md:relative top-0 right-0 h-full w-full md:w-80 lg:w-96 bg-white border-l border-gray-200 shadow-lg z-50 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Volunteer Profile</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
            aria-label="Close profile"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Profile Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Online Status */}
          <div className="flex items-center gap-2">
            <div
              className={`w-3 h-3 rounded-full ${
                online ? 'bg-green-500' : 'bg-gray-300'
              }`}
            />
            <span className="text-sm font-medium text-gray-700">
              {online ? 'Online' : 'Offline'}
            </span>
          </div>

          {/* Display Name */}
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
              Name
            </label>
            <p className="text-base text-gray-900">
              {volunteer.display_name || volunteer.email}
            </p>
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
              Email
            </label>
            <p className="text-base text-gray-900 break-words">
              {volunteer.email}
            </p>
          </div>

          {/* Phone */}
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
              Phone
            </label>
            <p className="text-base text-gray-900">
              {volunteer.phone || <span className="text-gray-400 italic">Not provided</span>}
            </p>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
              About
            </label>
            <p className="text-base text-gray-900 whitespace-pre-wrap">
              {volunteer.description || <span className="text-gray-400 italic">No description</span>}
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
