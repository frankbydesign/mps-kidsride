'use client';

import { supabase } from '@/lib/supabase';

interface PendingApprovalProps {
  userEmail: string;
  onSignOut: () => void;
}

export default function PendingApproval({ userEmail, onSignOut }: PendingApprovalProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-lg shadow-xl p-8">
          <div className="text-center">
            {/* Clock icon */}
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-yellow-100 mb-4">
              <svg
                className="h-8 w-8 text-yellow-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>

            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Pending Approval
            </h1>

            <p className="text-gray-600 mb-4">
              Your volunteer account is awaiting approval from an administrator.
            </p>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-blue-800">
                <strong>Signed in as:</strong> {userEmail}
              </p>
            </div>

            <p className="text-sm text-gray-500 mb-6">
              You will be notified via email once your account has been approved.
              Please check back later or contact an administrator if you have questions.
            </p>

            <button
              onClick={onSignOut}
              className="w-full bg-gray-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>

        <div className="mt-6 text-center text-sm text-gray-600">
          <p>MPS Kids Ride Hotline - Volunteer Portal</p>
        </div>
      </div>
    </div>
  );
}
