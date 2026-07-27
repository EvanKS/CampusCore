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

  const _isMember = (_g: StudyGroup) =>
    (detail as GroupDetail | undefined)?.members?.some(m => m.id === user?.id) ?? false;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <UsersRound className="w-6 h-6" style={{ color: 'var(--color-brand-primary)' }} />
            Study Groups
          </h1>
          <p className="page-subtitle">Collaborate with peers, schedule sessions, share meet links</p>
        </div>
        {user?.role === 'student' && (
          <button className="btn-primary" onClick={() => setShowForm(p => !p)}>
            <Plus className="w-4 h-4" />
            New Group
          </button>
        )}
      </div>

      {/* Create group form */}
      {showForm && (
        <div className="card p-5 space-y-4 animate-slide-up">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Create Study Group</h2>
            <button className="btn-ghost p-1.5" onClick={() => setShowForm(false)} aria-label="Close form">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label" htmlFor="group-name">Group Name *</label>
              <input
                id="group-name"
                className="input"
                placeholder="e.g. DSA Morning Crew"
                value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              />
            </div>
            <div>
              <label className="label" htmlFor="group-max">Max Members</label>
              <input
                id="group-max"
                type="number"
                className="input"
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
              className="input"
              rows={3}
              placeholder="What will this group focus on?"
              value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
            />
          </div>

          <div>
            <label className="label" htmlFor="group-meet">Google Meet Link (optional)</label>
            <input
              id="group-meet"
              className="input"
              placeholder="https://meet.google.com/..."
              value={form.googleMeetLink}
              onChange={e => setForm(p => ({ ...p, googleMeetLink: e.target.value }))}
            />
          </div>

          <div className="flex gap-3 justify-end">
            <button className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
            <button
              className="btn-primary"
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
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--color-brand-primary)' }} />
        </div>
      ) : groups.length === 0 ? (
        <div className="card p-16 text-center">
          <UsersRound className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
          <p className="font-medium" style={{ color: 'var(--text-primary)' }}>No study groups yet</p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Be the first to create one for your class!
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
              <div key={g.id} className="card overflow-hidden">
                <button
                  className="w-full flex items-center justify-between p-5 text-left hover:bg-[var(--bg-card-hover)] transition-colors"
                  onClick={() => setExpandedId(isExpanded ? null : g.id)}
                  aria-expanded={isExpanded}
                >
                  <div className="flex items-start gap-4 min-w-0">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0"
                      style={{ background: 'linear-gradient(135deg, var(--color-brand-primary), hsl(286,75%,60%))' }}
                    >
                      {g.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm truncate" style={{ color: 'var(--text-primary)' }}>{g.name}</p>
                      <div className="flex items-center flex-wrap gap-3 mt-1">
                        {g.subject_name && (
                          <span className="badge badge-brand">{g.subject_name}</span>
                        )}
                        <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                          <Users className="w-3 h-3" />
                          {g.member_count}/{g.max_members}
                          {full && <span className="badge badge-warning ml-1">Full</span>}
                        </span>
                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>by {g.creator_name}</span>
                      </div>
                    </div>
                  </div>
                  {isExpanded
                    ? <ChevronUp className="w-4 h-4 shrink-0" style={{ color: 'var(--text-muted)' }} />
                    : <ChevronDown className="w-4 h-4 shrink-0" style={{ color: 'var(--text-muted)' }} />
                  }
                </button>

                {isExpanded && (
                  <div className="border-t px-5 pb-5 pt-4 space-y-4 animate-slide-up" style={{ borderColor: 'var(--border-default)' }}>
                    {g.description && (
                      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{g.description}</p>
                    )}

                    <div className="flex flex-wrap gap-3">
                      {g.google_meet_link && (
                        <a
                          href={g.google_meet_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-secondary text-sm gap-2"
                        >
                          <Video className="w-4 h-4" />
                          Join Meet
                        </a>
                      )}
                      {user?.role === 'student' && (
                        isMemberOfGroup ? (
                          <button
                            className="btn-secondary text-sm gap-2 text-red-500"
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
                            className="btn-primary text-sm gap-2"
                            disabled={joinMutation.isPending || full}
                            onClick={() => joinMutation.mutate(g.id)}
                          >
                            {joinMutation.isPending
                              ? <Loader2 className="w-4 h-4 animate-spin" />
                              : <LogIn className="w-4 h-4" />
                            }
                            {full ? 'Group Full' : 'Join Group'}
                          </button>
                        )
                      )}
                    </div>

                    {/* Members */}
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>
                        Members ({groupDetail?.members?.length ?? 0})
                      </p>
                      {detailLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" style={{ color: 'var(--text-muted)' }} />
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {groupDetail?.members?.map(m => (
                            <div key={m.id} className="flex items-center gap-1.5 rounded-full px-3 py-1" style={{ background: 'var(--bg-input)' }}>
                              <div
                                className="w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                                style={{ background: 'var(--color-brand-primary)' }}
                              >
                                {m.full_name.charAt(0)}
                              </div>
                              <span className="text-xs" style={{ color: 'var(--text-primary)' }}>{m.full_name}</span>
                            </div>
                          ))}
                          {!groupDetail?.members?.length && (
                            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>No members yet</p>
                          )}
                        </div>
                      )}
                    </div>

                    {g.meeting_schedule && Object.keys(g.meeting_schedule).length > 0 && (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>
                          <Calendar className="w-3 h-3 inline mr-1" />
                          Schedule
                        </p>
                        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
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
