'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/Toaster';
import { Plus, Bell, X, Loader2, Sparkles } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { DEMO_NOTICES } from '@/lib/demoData';

import { PageHeader } from '@/components/layout/PageHeader';

interface Notice {
  id: string;
  title: string;
  body: string;
  ai_summary?: string;
  target_scope: string;
  author_name: string;
  published_at: string;
  created_at: string;
}

const NoticeSchema = z.object({
  title: z.string().min(1, 'Title is required').max(500),
  body: z.string().min(1, 'Content is required'),
  targetScope: z.enum(['all', 'students', 'teachers', 'parents', 'specific_branch', 'specific_year']),
  isBroadcast: z.boolean(),
});

type NoticeForm = z.infer<typeof NoticeSchema>;

export default function NoticesPage() {
  const { user, isDemoMode } = useAuth();
  const toast = useToast();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [selectedNotice, setSelectedNotice] = useState<Notice | null>(null);
  const [demoNotices, setDemoNotices] = useState<Notice[]>(DEMO_NOTICES as Notice[]);


  const { data, isLoading } = useQuery({
    queryKey: ['notices'],
    queryFn: () => api.get('/notices?limit=50').then(r => r.data),
    enabled: !isDemoMode,
  });

  const createMutation = useMutation({
    mutationFn: (data: NoticeForm) => api.post('/notices', data),
    onSuccess: () => {
      toast('success', 'Notice posted! AI summary and WhatsApp broadcast initiated.');
      qc.invalidateQueries({ queryKey: ['notices'] });
      setShowForm(false);
    },
    onError: () => toast('error', 'Failed to post notice'),
  });

  const handleDemoCreate = (formData: NoticeForm) => {
    const newNotice: Notice = {
      id: `notice-demo-${Date.now()}`,
      title: formData.title,
      body: formData.body,
      ai_summary: '• AI summary generated via Groq\n• Key notice details summarized automatically\n• WhatsApp broadcast dispatches to target roster',
      target_scope: formData.targetScope,
      author_name: 'You (Demo)',
      published_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    };
    setDemoNotices(prev => [newNotice, ...prev]);
    toast('success', 'Notice posted! (Demo mode — AI summary simulated)');
    setShowForm(false);
  };

  const notices: Notice[] = isDemoMode ? demoNotices : (data?.data ?? []);

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Campus Notices & Bulletins"
        category="Account"
        breadcrumb="Notices"
        actions={
          (user?.role === 'teacher' || user?.role === 'admin') ? (
            <button className="btn-primary shrink-0 shadow-md" onClick={() => setShowForm(true)}>
              <Plus className="w-4 h-4" />
              Post Notice
            </button>
          ) : undefined
        }
      />



      {/* AI info banner for teachers/admin */}
      {(user?.role === 'teacher' || user?.role === 'admin') && (
        <div className="card p-4 flex items-start gap-3 border-blue-200 dark:border-blue-800/60 bg-blue-50/50 dark:bg-blue-950/30">
          <Sparkles className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
          <p className="text-xs sm:text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
            When you post a notice, AI automatically compiles a concise 3-bullet summary and dispatches WhatsApp broadcasts to target student profiles.
          </p>
        </div>
      )}

      {/* Create notice modal */}
      {showForm && (
        <NoticeModal
          onSubmit={(data) => {
            if (isDemoMode) {
              handleDemoCreate(data);
            } else {
              createMutation.mutate(data);
            }
          }}
          onClose={() => setShowForm(false)}
          isLoading={createMutation.isPending}
        />
      )}

      {/* Notice detail modal */}
      {selectedNotice && (
        <NoticeDetailModal
          notice={selectedNotice}
          onClose={() => setSelectedNotice(null)}
        />
      )}

      {/* Notices list */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
        </div>
      ) : notices.length === 0 ? (
        <div className="card p-12 text-center">
          <Bell className="w-12 h-12 mx-auto mb-3 text-slate-400" />
          <p className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>No notices posted yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notices.map((notice) => (
            <button
              key={notice.id}
              className="card p-5 w-full text-left hover:border-blue-500/50 hover:shadow-md transition-all animate-slide-up group"
              onClick={() => setSelectedNotice(notice)}
              aria-label={`View notice: ${notice.title}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <Bell className="w-4 h-4 shrink-0 text-blue-600 dark:text-blue-400" />
                    <h3 className="font-extrabold text-sm sm:text-base tracking-tight" style={{ color: 'var(--text-primary)' }}>{notice.title}</h3>
                    <span className="badge badge-brand capitalize">{notice.target_scope.replace('_', ' ')}</span>
                  </div>

                  {/* AI Summary preview */}
                  {notice.ai_summary ? (
                    <div className="flex items-start gap-2 mb-3.5 p-3 rounded-xl bg-blue-50/60 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/40">
                      <Sparkles className="w-4 h-4 shrink-0 mt-0.5 text-blue-600 dark:text-blue-400" />
                      <p className="text-xs sm:text-sm font-medium line-clamp-2 whitespace-pre-line" style={{ color: 'var(--text-secondary)' }}>
                        {notice.ai_summary}
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm line-clamp-2 mb-3 font-medium" style={{ color: 'var(--text-secondary)' }}>
                      {notice.body}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-3 text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
                    <span>By {notice.author_name}</span>
                    <span>·</span>
                    <span>{formatDistanceToNow(new Date(notice.published_at || notice.created_at), { addSuffix: true })}</span>
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function NoticeModal({
  onSubmit, onClose, isLoading,
}: {
  onSubmit: (data: NoticeForm) => void;
  onClose: () => void;
  isLoading: boolean;
}) {
  const { register, handleSubmit, formState: { errors } } = useForm<NoticeForm>({
    resolver: zodResolver(NoticeSchema),
    defaultValues: { targetScope: 'all', isBroadcast: true },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in" role="dialog" aria-modal="true" aria-labelledby="notice-modal-title">
      <div className="card w-full max-w-2xl p-6 animate-slide-up max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="flex items-center justify-between mb-5 border-b pb-3" style={{ borderColor: 'var(--border-default)' }}>
          <h2 id="notice-modal-title" className="font-extrabold text-lg" style={{ color: 'var(--text-primary)' }}>
            Post Announcement / Notice
          </h2>
          <button className="btn-ghost p-1" onClick={onClose} aria-label="Close dialog"><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <div>
            <label htmlFor="notice-title" className="label">Title *</label>
            <input id="notice-title" className="input font-semibold" placeholder="Notice title..." {...register('title')} />
            {errors.title && <p className="text-xs mt-1 text-red-500 font-medium">{errors.title.message}</p>}
          </div>

          <div>
            <label htmlFor="notice-body" className="label">Content *</label>
            <textarea id="notice-body" className="input" rows={6} placeholder="Detailed announcement text..." {...register('body')} />
            {errors.body && <p className="text-xs mt-1 text-red-500 font-medium">{errors.body.message}</p>}
          </div>

          <div>
            <label htmlFor="notice-scope" className="label">Target Audience</label>
            <select id="notice-scope" className="input font-semibold" {...register('targetScope')}>
              <option value="all">Everyone</option>
              <option value="students">Students Only</option>
              <option value="teachers">Teachers Only</option>
              <option value="parents">Parents Only</option>
              <option value="specific_branch">Specific Branch</option>
              <option value="specific_year">Specific Year</option>
            </select>
          </div>

          <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border border-[var(--border-default)] hover:border-blue-500 transition-colors">
            <input type="checkbox" className="rounded w-4 h-4 text-blue-600" {...register('isBroadcast')} id="notice-broadcast" />
            <div>
              <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>WhatsApp Broadcast</p>
              <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Send automated WhatsApp dispatches to target recipients</p>
            </div>
          </label>

          <div className="flex items-center gap-2 p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60">
            <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
            <p className="text-xs font-semibold text-blue-900 dark:text-blue-200">
              AI automatically processes a 3-bullet summary upon publishing.
            </p>
          </div>

          <div className="flex gap-3 pt-3">
            <button type="button" className="btn-secondary flex-1" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary flex-1" disabled={isLoading}>
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Post Notice'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function NoticeDetailModal({ notice, onClose }: { notice: Notice; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in" role="dialog" aria-modal="true" aria-labelledby="notice-detail-title">
      <div className="card w-full max-w-2xl p-6 animate-slide-up max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="flex items-start justify-between gap-4 mb-4 pb-3 border-b" style={{ borderColor: 'var(--border-default)' }}>
          <h2 id="notice-detail-title" className="font-extrabold text-lg sm:text-xl tracking-tight" style={{ color: 'var(--text-primary)' }}>
            {notice.title}
          </h2>
          <button className="btn-ghost p-1 shrink-0" onClick={onClose} aria-label="Close"><X className="w-5 h-5" /></button>
        </div>

        <div className="flex flex-wrap items-center gap-2 mb-4">
          <span className="badge badge-brand capitalize font-bold">{notice.target_scope.replace('_', ' ')}</span>
          <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
            By {notice.author_name} · {formatDistanceToNow(new Date(notice.published_at || notice.created_at), { addSuffix: true })}
          </span>
        </div>

        {notice.ai_summary && (
          <div className="card p-4 mb-5 bg-blue-50/80 dark:bg-blue-950/50 border-blue-200 dark:border-blue-800/80">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <p className="text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300">AI Summary</p>
            </div>
            <p className="text-sm font-medium whitespace-pre-line" style={{ color: 'var(--text-primary)' }}>{notice.ai_summary}</p>
          </div>
        )}

        <div className="prose prose-sm max-w-none mb-6">
          <p className="text-sm whitespace-pre-wrap font-medium" style={{ color: 'var(--text-primary)', lineHeight: '1.8' }}>
            {notice.body}
          </p>
        </div>

        <div className="pt-4 border-t flex justify-end" style={{ borderColor: 'var(--border-default)' }}>
          <button className="btn-primary text-xs font-bold px-5" onClick={onClose}>
            Close Notice
          </button>
        </div>
      </div>
    </div>
  );
}
