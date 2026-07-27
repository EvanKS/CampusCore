'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useToast } from '@/components/ui/Toaster';
import { Bell, Check, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

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
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="page-header mb-0">
          <h1 className="page-title flex items-center gap-2">
            <Bell className="w-6 h-6" style={{ color: 'var(--color-brand-primary)' }} />
            Notifications
            {unreadCount > 0 && (
              <span className="badge-danger badge text-xs ml-1">{unreadCount}</span>
            )}
          </h1>
        </div>
        {unreadCount > 0 && (
          <button
            className="btn-secondary text-sm"
            onClick={() => readAllMutation.mutate()}
            disabled={readAllMutation.isPending}
          >
            <Check className="w-4 h-4" />
            Mark all read
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--color-brand-primary)' }} />
        </div>
      ) : notifications.length === 0 ? (
        <div className="card p-12 text-center">
          <Bell className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
          <p className="font-medium" style={{ color: 'var(--text-primary)' }}>You&apos;re all caught up!</p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>No notifications to show.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((notif: { id: string; title: string; body: string; is_read: boolean; created_at: string }) => (
            <div
              key={notif.id}
              className={`card p-4 flex items-start gap-4 transition-all ${!notif.is_read ? '' : 'opacity-70'}`}
            >
              <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${!notif.is_read ? 'bg-violet-500' : 'bg-transparent'}`} aria-hidden="true" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>{notif.title}</p>
                <p className="text-sm mt-0.5 line-clamp-2" style={{ color: 'var(--text-secondary)' }}>{notif.body}</p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                  {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true })}
                </p>
              </div>
              {!notif.is_read && (
                <button
                  className="btn-ghost p-1.5 shrink-0"
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
