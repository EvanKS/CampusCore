'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/Toaster';
import {
  UsersRound, Plus, Loader2, X, LogIn, LogOut, Video,
  Calendar, Users, ChevronDown, ChevronUp,
} from 'lucide-react';

interface StudyGroup {
  id: string;
  name: string;
  description?: string;
  subject_name?: string;
  creator_name: string;
  member_count: number;
  max_members: number;
  google_meet_link?: string;
  meeting_schedule?: Record<string, unknown>;
  created_at: string;
}

interface GroupMember {
  id: string;
  full_name: string;
  avatar_url?: string;
}

interface GroupDetail extends StudyGroup {
  members: GroupMember[];
}

export default function StudyGroupsPage() {
  const { user } = useAuth();
  const toast = useToast();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    description: '',
    maxMembers: 10,
    googleMeetLink: '',
  });

  const { data, isLoading } = useQuery({
    queryKey: ['study-groups'],
    queryFn: () => api.get('/study-groups').then(r => r.data),
  });

  const { data: detail, isLoading: detailLoading } = useQuery({
    queryKey: ['study-group', expandedId],
    queryFn: () => api.get(`/study-groups/${expandedId}`).then(r => r.data),
    enabled: !!expandedId,
  });

  const createMutation = useMutation({
    mutationFn: (d: typeof form) =>
      api.post('/study-groups', {
        name: d.name,
        description: d.description || undefined,
        maxMembers: d.maxMembers,
        googleMeetLink: d.googleMeetLink || undefined,
      }),
    onSuccess: () => {
      toast('success', 'Study group created!');
      qc.invalidateQueries({ queryKey: ['study-groups'] });
      setForm({ name: '', description: '', maxMembers: 10, googleMeetLink: '' });
      setShowForm(false);
    },
    onError: () => toast('error', 'Failed to create group'),
  });

  const joinMutation = useMutation({
    mutationFn: (id: string) => api.post(`/study-groups/${id}/join`),
    onSuccess: () => {
      toast('success', 'Joined group!');
      qc.invalidateQueries({ queryKey: ['study-groups'] });
      if (expandedId) qc.invalidateQueries({ queryKey: ['study-group', expandedId] });
    },
    onError: (err: { response?: { data?: { error?: string } } }) =>
      toast('error', err?.response?.data?.error || 'Failed to join group'),
  });

  const leaveMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/study-groups/${id}/leave`),
    onSuccess: () => {
      toast('success', 'Left group');
      qc.invalidateQueries({ queryKey: ['study-groups'] });
      if (expandedId) qc.invalidateQueries({ queryKey: ['study-group', expandedId] });
    },
    onError: () => toast('error', 'Failed to leave group'),
  });

  const groups: StudyGroup[] = data?.data ?? [];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="page-header mb-0">
          <h1 className="page-title flex items-center gap-2">
            <UsersRound className="w-7 h-7 text-blue-600 dark:text-blue-400" />
            Study Groups
          </h1>
          <p className="page-subtitle">Collaborate with peers, schedule joint sessions, and share meeting links.</p>
        </div>
        {user?.role === 'student' && (
          <button className="btn-primary shrink-0 shadow-md" onClick={() => setShowForm(p => !p)}>
            <Plus className="w-4 h-4" />
            Create Group
          </button>
        )}
      </div>

      {/* Create group form */}
      {showForm && (
        <div className="card p-6 space-y-4 animate-slide-up shadow-xl">
          <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--border-default)' }}>
            <h2 className="font-extrabold text-lg" style={{ color: 'var(--text-primary)' }}>Create Study Group</h2>
            <button className="btn-ghost p-1" onClick={() => setShowForm(false)} aria-label="Close form">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label" htmlFor="group-name">Group Name *</label>
              <input
                id="group-name"
                className="input font-semibold"
                placeholder="e.g. DSA Morning Practice Group"
                value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              />
            </div>
            <div>
              <label className="label" htmlFor="group-max">Max Members</label>
              <input
                id="group-max"
                type="number"
                className="input font-semibold"
                min={2}
                max={50}
                value={form.maxMembers}
                onChange={e => setForm(p => ({ ...p, maxMembers: parseInt(e.target.value, 10) || 10 }))}
              />
            </div>
          </div>

          <div>
            <label className="label" htmlFor="group-desc">Description</label>
            <textarea
              id="group-desc"
              className="input font-medium"
              rows={3}
              placeholder="Target topics, schedule, or group rules..."
              value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
            />
          </div>

          <div>
            <label className="label" htmlFor="group-meet">Google Meet Link (optional)</label>
            <input
              id="group-meet"
              className="input font-medium"
              placeholder="https://meet.google.com/..."
              value={form.googleMeetLink}
              onChange={e => setForm(p => ({ ...p, googleMeetLink: e.target.value }))}
            />
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <button className="btn-secondary flex-1 sm:flex-none" onClick={() => setShowForm(false)}>Cancel</button>
            <button
              className="btn-primary flex-1 sm:flex-none font-bold"
              disabled={!form.name.trim() || createMutation.isPending}
              onClick={() => createMutation.mutate(form)}
            >
              {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Group'}
            </button>
          </div>
        </div>
      )}

      {/* Group list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : groups.length === 0 ? (
        <div className="card p-16 text-center">
          <UsersRound className="w-12 h-12 mx-auto mb-3 text-slate-400" />
          <p className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>No study groups active</p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Click "Create Group" to start a peer study session.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map(g => {
            const isExpanded = expandedId === g.id;
            const groupDetail = isExpanded ? (detail as GroupDetail | undefined) : undefined;
            const isMemberOfGroup = groupDetail?.members?.some(m => m.id === user?.id) ?? false;
            const full = Number(g.member_count) >= g.max_members;

            return (
              <div key={g.id} className="card overflow-hidden transition-all hover:border-blue-500/50">
                <button
                  className="w-full flex items-center justify-between p-5 text-left hover:bg-[var(--bg-card-hover)] transition-colors"
                  onClick={() => setExpandedId(isExpanded ? null : g.id)}
                  aria-expanded={isExpanded}
                >
                  <div className="flex items-start gap-4 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-800 text-white font-extrabold text-sm flex items-center justify-center shrink-0 shadow-md">
                      {g.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-extrabold text-base tracking-tight truncate" style={{ color: 'var(--text-primary)' }}>{g.name}</p>
                      <div className="flex items-center flex-wrap gap-2.5 mt-1">
                        {g.subject_name && (
                          <span className="badge badge-brand font-bold">{g.subject_name}</span>
                        )}
                        <span className="flex items-center gap-1 text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
                          <Users className="w-3.5 h-3.5 text-blue-500" />
                          {g.member_count}/{g.max_members} members
                          {full && <span className="badge badge-warning ml-1">Full</span>}
                        </span>
                        <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>by {g.creator_name}</span>
                      </div>
                    </div>
                  </div>
                  {isExpanded
                    ? <ChevronUp className="w-5 h-5 shrink-0 text-slate-400" />
                    : <ChevronDown className="w-5 h-5 shrink-0 text-slate-400" />
                  }
                </button>

                {isExpanded && (
                  <div className="border-t px-5 pb-5 pt-4 space-y-4 animate-slide-up bg-slate-50/50 dark:bg-slate-900/30" style={{ borderColor: 'var(--border-default)' }}>
                    {g.description && (
                      <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>{g.description}</p>
                    )}

                    <div className="flex flex-wrap gap-3">
                      {g.google_meet_link && (
                        <a
                          href={g.google_meet_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-secondary text-xs font-bold gap-2 text-blue-600 hover:text-blue-700"
                        >
                          <Video className="w-4 h-4 text-blue-600" />
                          Join Google Meet
                        </a>
                      )}
                      {user?.role === 'student' && (
                        isMemberOfGroup ? (
                          <button
                            className="btn-secondary text-xs font-bold gap-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                            disabled={leaveMutation.isPending}
                            onClick={() => leaveMutation.mutate(g.id)}
                          >
                            {leaveMutation.isPending
                              ? <Loader2 className="w-4 h-4 animate-spin" />
                              : <LogOut className="w-4 h-4" />
                            }
                            Leave Group
                          </button>
                        ) : (
                          <button
                            className="btn-primary text-xs font-bold gap-2"
                            disabled={joinMutation.isPending || full}
                            onClick={() => joinMutation.mutate(g.id)}
                          >
                            {joinMutation.isPending
                              ? <Loader2 className="w-4 h-4 animate-spin" />
                              : <LogIn className="w-4 h-4" />
                            }
                            {full ? 'Group Full' : 'Join Study Group'}
                          </button>
                        )
                      )}
                    </div>

                    {/* Members List */}
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
                        Group Roster ({groupDetail?.members?.length ?? 0})
                      </p>
                      {detailLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {groupDetail?.members?.map(m => (
                            <div key={m.id} className="flex items-center gap-1.5 rounded-full px-3 py-1 bg-[var(--bg-card)] border border-[var(--border-default)] shadow-sm">
                              <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-700 text-white text-[10px] font-extrabold flex items-center justify-center shrink-0">
                                {m.full_name.charAt(0)}
                              </div>
                              <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{m.full_name}</span>
                            </div>
                          ))}
                          {!groupDetail?.members?.length && (
                            <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>No members joined yet</p>
                          )}
                        </div>
                      )}
                    </div>

                    {g.meeting_schedule && Object.keys(g.meeting_schedule).length > 0 && (
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>
                          <Calendar className="w-3.5 h-3.5 inline mr-1 text-blue-500" />
                          Meeting Schedule
                        </p>
                        <p className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
                          {JSON.stringify(g.meeting_schedule)}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
