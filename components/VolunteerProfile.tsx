'use client';

import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Volunteer } from '@/lib/types';

interface VolunteerProfileProps {
  volunteer: Volunteer | null;
  isOpen: boolean;
  onClose: () => void;
  currentUserId: string;
  currentUserIsAdmin: boolean;
}

const EDITABLE_FIELDS = [
  { key: 'display_name', label: 'Name' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
  { key: 'description', label: 'About' },
  { key: 'car_make', label: 'Car Make' },
  { key: 'car_color', label: 'Car Color' },
  { key: 'license_plate', label: 'License Plate' },
] as const;

type EditableKey = typeof EDITABLE_FIELDS[number]['key'];
type FormData = Record<EditableKey, string>;

function toFormData(v: Volunteer): FormData {
  return {
    display_name: v.display_name ?? '',
    email: v.email ?? '',
    phone: v.phone ?? '',
    description: v.description ?? '',
    car_make: v.car_make ?? '',
    car_color: v.car_color ?? '',
    license_plate: v.license_plate ?? '',
  };
}

export default function VolunteerProfile({
  volunteer,
  isOpen,
  onClose,
  currentUserId,
  currentUserIsAdmin,
}: VolunteerProfileProps) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<FormData>({
    display_name: '', email: '', phone: '', description: '',
    car_make: '', car_color: '', license_plate: '',
  });
  const [saving, setSaving] = useState(false);
  const supabase = useMemo(() => createClient(), []);

  // Reset edit mode when volunteer changes or panel closes
  useEffect(() => {
    setEditing(false);
    if (volunteer) setForm(toFormData(volunteer));
  }, [volunteer?.id, isOpen]);

  if (!isOpen || !volunteer) return null;

  const isOnline = (lastSeen: string | null) => {
    if (!lastSeen) return false;
    const diffMinutes = (Date.now() - new Date(lastSeen).getTime()) / 60000;
    return diffMinutes < 3;
  };

  const online = isOnline(volunteer.last_seen);
  const canEdit = currentUserIsAdmin || volunteer.id === currentUserId;
  const panelTitle = volunteer.is_admin ? 'Administrator Profile' : 'Volunteer Profile';

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('volunteers')
      .update({
        display_name: form.display_name.trim() || null,
        phone: form.phone.trim() || null,
        description: form.description.trim() || null,
        car_make: form.car_make.trim() || null,
        car_color: form.car_color.trim() || null,
        license_plate: form.license_plate.trim() || null,
      })
      .eq('id', volunteer.id);
    setSaving(false);

    if (error) {
      console.error('Error updating volunteer:', error);
      return;
    }
    setEditing(false);
  };

  const handleCancel = () => {
    setForm(toFormData(volunteer));
    setEditing(false);
  };

  const handleChange = (key: EditableKey, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const renderField = (key: EditableKey, label: string) => {
    const isTextarea = key === 'description';

    return (
      <div key={key}>
        <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
          {label}
        </label>
        {editing ? (
          isTextarea ? (
            <textarea
              value={form[key]}
              onChange={(e) => handleChange(key, e.target.value)}
              rows={3}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          ) : (
            <input
              type="text"
              value={form[key]}
              onChange={(e) => handleChange(key, e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          )
        ) : (
          <p className={`text-base text-gray-900 ${isTextarea ? 'whitespace-pre-wrap' : ''} ${key === 'email' ? 'break-words' : ''}`}>
            {(volunteer[key] as string | null) || <span className="text-gray-400 italic">Not provided</span>}
          </p>
        )}
      </div>
    );
  };

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
          <h2 className="text-lg font-semibold text-gray-900">{panelTitle}</h2>
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

          {EDITABLE_FIELDS.map(({ key, label }) => renderField(key, label))}

          {/* Edit / Save / Cancel buttons */}
          {canEdit && !editing && (
            <button
              onClick={() => { setForm(toFormData(volunteer)); setEditing(true); }}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors text-sm"
            >
              Edit Profile
            </button>
          )}
          {editing && (
            <div className="flex gap-3">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors text-sm"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={handleCancel}
                disabled={saving}
                className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-lg font-medium hover:bg-gray-300 disabled:opacity-50 transition-colors text-sm"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
