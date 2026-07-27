'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/Toaster';
import { Settings, User, Bell, Shield, Save, Loader2, Eye, EyeOff } from 'lucide-react';

type SettingsTab = 'profile' | 'notifications' | 'security';

interface NotificationPrefs {
  email: boolean;
  whatsapp: boolean;
  in_app: boolean;
}

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const toast = useToast();
  const qc = useQueryClient();
  const [tab, setTab] = useState<SettingsTab>('profile');

  // Profile form
  const [profile, setProfile] = useState({ fullName: user?.full_name ?? '', phone: user?.phone ?? '' });
  const [showPassword, setShowPassword] = useState(false);
  const [passwords, setPasswords] = useState({ current: '', next: '', confirm: '' });

  useEffect(() => {
    if (user) {
      setProfile({ fullName: user.full_name ?? '', phone: user.phone ?? '' });
    }
  }, [user]);

  // Notification prefs
  const { data: prefs } = useQuery<{ data: NotificationPrefs }>({
    queryKey: ['notification-prefs'],
    queryFn: () => api.get('/notifications/preferences').then(r => r.data),
  });

  const updateProfileMutation = useMutation({
    mutationFn: (d: { fullName: string; phone: string }) =>
      api.patch('/users/profile', { fullName: d.fullName, phone: d.phone || undefined }),
    onSuccess: () => {
      toast('success', 'Profile updated!');
      qc.invalidateQueries({ queryKey: ['me'] });
    },
    onError: () => toast('error', 'Failed to update profile'),
  });

  const changePasswordMutation = useMutation({
    mutationFn: (d: { current: string; next: string }) =>
      api.post('/auth/change-password', { currentPassword: d.current, newPassword: d.next }),
    onSuccess: () => {
      toast('success', 'Password changed!');
      setPasswords({ current: '', next: '', confirm: '' });
    },
    onError: (err: { response?: { data?: { error?: string } } }) =>
      toast('error', err?.response?.data?.error ?? 'Failed to change password'),
  });

  const updatePrefsMutation = useMutation({
    mutationFn: (prefs: Partial<NotificationPrefs>) =>
      api.patch('/notifications/preferences', prefs),
    onSuccess: () => {
      toast('success', 'Notification preferences saved!');
      qc.invalidateQueries({ queryKey: ['notification-prefs'] });
    },
    onError: () => toast('error', 'Failed to save preferences'),
  });

  const tabs: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
    { id: 'profile', label: 'Profile', icon: <User className="w-4 h-4" /> },
    { id: 'notifications', label: 'Notifications', icon: <Bell className="w-4 h-4" /> },
    { id: 'security', label: 'Security', icon: <Shield className="w-4 h-4" /> },
  ];

  const currentPrefs: NotificationPrefs = prefs?.data ?? { email: true, whatsapp: true, in_app: true };

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <div className="page-header">
        <h1 className="page-title flex items-center gap-2">
          <Settings className="w-6 h-6" style={{ color: 'var(--color-brand-primary)' }} />
          Settings
        </h1>
        <p className="page-subtitle">Manage your account preferences</p>
      </div>

      {/* Tab switcher */}
      <div
        className="flex gap-1 p-1 rounded-xl"
        style={{ background: 'var(--bg-input)' }}
        role="tablist"
      >
        {tabs.map(t => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === t.id ? 'bg-[var(--bg-card)] shadow-sm' : 'hover:bg-[var(--bg-card-hover)]'
            }`}
            style={{ color: tab === t.id ? 'var(--color-brand-primary)' : 'var(--text-secondary)' }}
            onClick={() => setTab(t.id)}
          >
            {t.icon}
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* Profile tab */}
      {tab === 'profile' && (
        <div className="card p-6 space-y-5 animate-fade-in">
          {/* Avatar */}
          <div className="flex items-center gap-4">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-bold"
              style={{ background: 'linear-gradient(135deg, var(--color-brand-primary), hsl(286,75%,60%))' }}
              aria-hidden="true"
            >
              {user?.full_name.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{user?.full_name}</p>
              <p className="text-sm capitalize" style={{ color: 'var(--text-muted)' }}>{user?.role}</p>
            </div>
          </div>

          <div>
            <label className="label" htmlFor="settings-name">Full Name</label>
            <input
              id="settings-name"
              className="input"
              value={profile.fullName}
              onChange={e => setProfile(p => ({ ...p, fullName: e.target.value }))}
            />
          </div>

          <div>
            <label className="label" htmlFor="settings-email">Email</label>
            <input
              id="settings-email"
              className="input"
              value={user?.email ?? ''}
              disabled
              aria-describedby="email-note"
            />
            <p id="email-note" className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Email cannot be changed</p>
          </div>

          <div>
            <label className="label" htmlFor="settings-phone">Phone (WhatsApp)</label>
            <input
              id="settings-phone"
              type="tel"
              className="input"
              placeholder="+91 9876543210"
              value={profile.phone}
              onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))}
            />
          </div>

          <button
            className="btn-primary gap-2"
            disabled={updateProfileMutation.isPending || !profile.fullName.trim()}
            onClick={() => updateProfileMutation.mutate(profile)}
          >
            {updateProfileMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Profile
          </button>
        </div>
      )}

      {/* Notifications tab */}
      {tab === 'notifications' && (
        <div className="card p-6 space-y-5 animate-fade-in">
          <h2 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Notification Channels</h2>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Choose how you receive reminders, alerts, and notices.
          </p>

          {(
            [
              { key: 'email' as const, label: 'Email Notifications', desc: 'Receive updates via email' },
              { key: 'whatsapp' as const, label: 'WhatsApp Notifications', desc: 'Receive reminders via WhatsApp' },
              { key: 'in_app' as const, label: 'In-App Notifications', desc: 'Show notifications inside CampusFlow' },
            ] as const
          ).map(({ key, label, desc }) => (
            <div key={key} className="flex items-center justify-between p-4 rounded-lg" style={{ background: 'var(--bg-input)' }}>
              <div>
                <p className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>{label}</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{desc}</p>
              </div>
              <button
                role="switch"
                aria-checked={currentPrefs[key]}
                aria-label={label}
                className={`relative inline-flex w-11 h-6 items-center rounded-full transition-colors ${
                  currentPrefs[key] ? 'bg-[var(--color-brand-primary)]' : 'bg-[var(--border-default)]'
                }`}
                onClick={() =>
                  updatePrefsMutation.mutate({ ...currentPrefs, [key]: !currentPrefs[key] })
                }
              >
                <span
                  className={`inline-block w-4 h-4 rounded-full bg-white shadow transition-transform ${
                    currentPrefs[key] ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Security tab */}
      {tab === 'security' && (
        <div className="card p-6 space-y-5 animate-fade-in">
          <h2 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Change Password</h2>

          <div>
            <label className="label" htmlFor="curr-pass">Current Password</label>
            <div className="relative">
              <input
                id="curr-pass"
                type={showPassword ? 'text' : 'password'}
                className="input pr-10"
                value={passwords.current}
                onChange={e => setPasswords(p => ({ ...p, current: e.target.value }))}
                autoComplete="current-password"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 btn-ghost p-0"
                onClick={() => setShowPassword(p => !p)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="label" htmlFor="new-pass">New Password</label>
            <input
              id="new-pass"
              type="password"
              className="input"
              value={passwords.next}
              onChange={e => setPasswords(p => ({ ...p, next: e.target.value }))}
              autoComplete="new-password"
            />
          </div>

          <div>
            <label className="label" htmlFor="confirm-pass">Confirm New Password</label>
            <input
              id="confirm-pass"
              type="password"
              className="input"
              value={passwords.confirm}
              onChange={e => setPasswords(p => ({ ...p, confirm: e.target.value }))}
              autoComplete="new-password"
            />
            {passwords.next && passwords.confirm && passwords.next !== passwords.confirm && (
              <p className="text-xs mt-1" style={{ color: 'var(--color-danger)' }}>Passwords do not match</p>
            )}
          </div>

          <button
            className="btn-primary gap-2"
            disabled={
              changePasswordMutation.isPending ||
              !passwords.current ||
              !passwords.next ||
              passwords.next !== passwords.confirm ||
              passwords.next.length < 8
            }
            onClick={() => changePasswordMutation.mutate({ current: passwords.current, next: passwords.next })}
          >
            {changePasswordMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
            Update Password
          </button>

          <div className="border-t pt-4" style={{ borderColor: 'var(--border-default)' }}>
            <h3 className="font-medium mb-2" style={{ color: 'var(--text-primary)' }}>Session</h3>
            <button
              className="btn-secondary text-red-500 border-red-200 dark:border-red-900/30"
              onClick={() => { if (confirm('Sign out from all devices?')) logout(); }}
            >
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
