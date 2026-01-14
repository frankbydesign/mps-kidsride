'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { Volunteer } from '@/lib/supabase';

interface AdminApprovalProps {
  onClose: () => void;
}

export default function AdminApproval({ onClose }: AdminApprovalProps) {
  const [pendingVolunteers, setPendingVolunteers] = useState<Volunteer[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    fetchPendingVolunteers();

    // Subscribe to volunteer changes
    const channel = supabase
      .channel('admin-volunteers')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'volunteers'
        },
        () => {
          fetchPendingVolunteers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchPendingVolunteers = async () => {
    try {
      const { data, error } = await supabase
        .from('volunteers')
        .select('*')
        .eq('approved', false)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPendingVolunteers(data || []);
    } catch (error) {
      console.error('Error fetching pending volunteers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (volunteerId: string) => {
    setProcessingId(volunteerId);
    try {
      const { error } = await (supabase
        .from('volunteers') as any)
        .update({ approved: true })
        .eq('id', volunteerId);

      if (error) throw error;

      // Remove from local state
      setPendingVolunteers(prev => prev.filter(v => v.id !== volunteerId));
    } catch (error) {
      console.error('Error approving volunteer:', error);
      alert('Failed to approve volunteer. Please try again.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (volunteerId: string) => {
    if (!confirm('Are you sure you want to reject this volunteer? This will delete their account.')) {
      return;
    }

    setProcessingId(volunteerId);
    try {
      // Delete the volunteer record (will cascade to auth.users)
      const { error } = await supabase
        .from('volunteers')
        .delete()
        .eq('id', volunteerId);

      if (error) throw error;

      // Remove from local state
      setPendingVolunteers(prev => prev.filter(v => v.id !== volunteerId));
    } catch (error) {
      console.error('Error rejecting volunteer:', error);
      alert('Failed to reject volunteer. Please try again.');
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 p-4 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Approve Volunteers</h2>
          <p className="text-sm text-gray-600 mt-1">
            Review and approve new volunteer registrations
          </p>
        </div>
        <button
          onClick={onClose}
          className="text-gray-600 hover:text-gray-900 font-medium"
        >
          Close
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-gray-500">Loading...</div>
          </div>
        ) : pendingVolunteers.length === 0 ? (
          <div className="flex items-center justify-center h-64">
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
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p className="mt-4 text-lg text-gray-900">All caught up!</p>
              <p className="mt-2 text-sm text-gray-500">
                No pending volunteer approvals
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4 max-w-3xl mx-auto">
            {pendingVolunteers.map((volunteer) => (
              <div
                key={volunteer.id}
                className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {volunteer.display_name || volunteer.name || 'No name provided'}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      {volunteer.email}
                    </p>
                    <p className="text-xs text-gray-500 mt-2">
                      Registered: {new Date(volunteer.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 mt-4">
                  <button
                    onClick={() => handleApprove(volunteer.id)}
                    disabled={processingId === volunteer.id}
                    className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {processingId === volunteer.id ? 'Processing...' : 'Approve'}
                  </button>
                  <button
                    onClick={() => handleReject(volunteer.id)}
                    disabled={processingId === volunteer.id}
                    className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {processingId === volunteer.id ? 'Processing...' : 'Reject'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
