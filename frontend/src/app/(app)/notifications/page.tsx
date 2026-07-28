'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useToast } from '@/components/ui/Toaster';
import { Bell, Check, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

import { PageHeader } from '@/components/layout/PageHeader';

export default function NotificationsPage() {
  const toast = useToast();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.get('/notifications?limit=50').then(r => r.data),
  });

  const readMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/notifications/${id}/read`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const readAllMutation = useMutation({
    mutationFn: () => api.patch('/notifications/read-all'),
    onSuccess: () => {
      toast('success', 'All notifications marked as read');
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const notifications = data?.data ?? [];
  const unreadCount = data?.unreadCount ?? 0;

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      <PageHeader
        title="Notification Center"
        category="Account"
        breadcrumb="Notifications"
        actions={
          unreadCount > 0 ? (
            <button
              className="btn-primary text-xs font-extrabold shrink-0 shadow-sm"
              onClick={() => readAllMutation.mutate()}
              disabled={readAllMutation.isPending}
            >
              <Check className="w-4 h-4 text-white" />
              Mark All as Read ({unreadCount})
            </button>
          ) : undefined
        }
      />


      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="card p-12 text-center">
          <Bell className="w-12 h-12 mx-auto mb-3 text-slate-400" />
          <p className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>You&apos;re all caught up!</p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>No unread alerts or notifications.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {notifications.map((notif: { id: string; title: string; body: string; is_read: boolean; created_at: string }) => (
            <div
              key={notif.id}
              className={`card p-4.5 flex items-start gap-4 transition-all hover:border-blue-500/40 ${
                !notif.is_read ? 'bg-blue-50/40 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800/60 shadow-sm' : 'opacity-80'
              }`}
            >
              <div className={`w-2.5 h-2.5 rounded-full mt-2 shrink-0 ${!notif.is_read ? 'bg-blue-600 shadow-sm' : 'bg-transparent'}`} aria-hidden="true" />
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm sm:text-base" style={{ color: 'var(--text-primary)' }}>{notif.title}</p>
                <p className="text-xs sm:text-sm mt-1 line-clamp-2 font-medium" style={{ color: 'var(--text-secondary)' }}>{notif.body}</p>
                <p className="text-xs font-semibold mt-2" style={{ color: 'var(--text-muted)' }}>
                  {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true })}
                </p>
              </div>
              {!notif.is_read && (
                <button
                  className="btn-ghost p-1.5 shrink-0 text-slate-400 hover:text-blue-600"
                  onClick={() => readMutation.mutate(notif.id)}
                  aria-label="Mark as read"
                >
                  <Check className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
