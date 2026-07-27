'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { BarChart3, Users, TrendingUp, Shield } from 'lucide-react';

type AnalyticsTab = 'overview' | 'automation';

export default function AdminAnalyticsPage() {
  const [tab, setTab] = useState<AnalyticsTab>('overview');

  const { data: analytics } = useQuery({
    queryKey: ['admin', 'analytics'],
    queryFn: () => api.get('/admin/analytics').then(r => r.data),
  });

  const { data: automationLogs } = useQuery({
    queryKey: ['admin', 'automation-logs'],
    queryFn: () => api.get('/admin/automation-logs').then(r => r.data),
  });

  const { data: auditLog } = useQuery({
    queryKey: ['admin', 'audit-log'],
    queryFn: () => api.get('/admin/audit-log?limit=20').then(r => r.data),
    enabled: tab === 'overview',
  });

  const usersByRole = analytics?.users ?? [];
  const tasksByStatus = analytics?.tasks ?? [];
  const automationHealth = analytics?.automationHealth ?? [];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <h1 className="page-title flex items-center gap-2">
          <BarChart3 className="w-6 h-6" style={{ color: 'var(--color-brand-primary)' }} />
          Institution Analytics
        </h1>
        <p className="page-subtitle">Comprehensive view of your institution's activity</p>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: 'var(--bg-input)' }}>
        {(['overview', 'automation'] as AnalyticsTab[]).map(t => (
          <button
            key={t}
            className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all ${
              tab === t ? 'bg-[var(--bg-card)] shadow-sm' : 'hover:bg-[var(--bg-card-hover)]'
            }`}
            style={{ color: tab === t ? 'var(--color-brand-primary)' : 'var(--text-secondary)' }}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <>
          {/* Key metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {usersByRole.map((r: { role: string; count: number }) => {
              const icons: Record<string, React.ReactNode> = {
                student: <Users className="w-5 h-5" />,
                teacher: <TrendingUp className="w-5 h-5" />,
                parent: <Users className="w-5 h-5" />,
                admin: <Shield className="w-5 h-5" />,
              };
              const colors: Record<string, string> = {
                student: 'bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400',
                teacher: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400',
                parent: 'bg-sky-100 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400',
                admin: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400',
              };
              return (
                <div key={r.role} className="stat-card">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${colors[r.role] || ''}`}>
                    {icons[r.role] || <Users className="w-5 h-5" />}
                  </div>
                  <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{r.count}</p>
                  <p className="text-sm capitalize mt-0.5" style={{ color: 'var(--text-muted)' }}>{r.role}s</p>
                </div>
              );
            })}
          </div>

          {/* Avg attendance + task breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card p-5">
              <h2 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Task Status Breakdown</h2>
              <div className="space-y-3">
                {tasksByStatus.map((s: { status: string; count: number }) => {
                  const total = tasksByStatus.reduce((sum: number, t: { count: number }) => sum + Number(t.count), 0);
                  const pct = total > 0 ? Math.round((Number(s.count) / total) * 100) : 0;
                  const colors: Record<string, string> = {
                    pending: 'hsl(199, 89%, 48%)',
                    in_progress: 'var(--color-brand-primary)',
                    completed: 'var(--color-success)',
                    overdue: 'var(--color-danger)',
                  };
                  return (
                    <div key={s.status}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm capitalize" style={{ color: 'var(--text-secondary)' }}>
                          {s.status.replace('_', ' ')}
                        </span>
                        <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                          {s.count} ({pct}%)
                        </span>
                      </div>
                      <div className="progress-bar h-2">
                        <div className="progress-fill h-full" style={{ width: `${pct}%`, background: colors[s.status] || 'var(--color-brand-primary)' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="card p-5">
              <h2 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Key Metrics</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg" style={{ background: 'var(--bg-input)' }}>
                  <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Avg. Attendance</span>
                  <span className="text-lg font-bold" style={{ color: analytics?.avgAttendance >= 75 ? 'var(--color-success)' : 'var(--color-danger)' }}>
                    {analytics?.avgAttendance ?? '—'}%
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg" style={{ background: 'var(--bg-input)' }}>
                  <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Total Notices</span>
                  <span className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                    {analytics?.noticesTotal ?? '—'}
                  </span>
                </div>
                {automationHealth.map((h: { status: string; count: number }) => (
                  <div key={h.status} className="flex items-center justify-between p-3 rounded-lg" style={{ background: 'var(--bg-input)' }}>
                    <span className="text-sm capitalize" style={{ color: 'var(--text-secondary)' }}>
                      Automation {h.status} (7d)
                    </span>
                    <span className="text-lg font-bold" style={{ color: h.status === 'success' ? 'var(--color-success)' : 'var(--color-danger)' }}>
                      {h.count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Audit log */}
          <div className="card">
            <div className="p-5 border-b" style={{ borderColor: 'var(--border-default)' }}>
              <h2 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Recent Audit Log</h2>
            </div>
            <div className="table-wrapper border-0">
              <table aria-label="Audit log">
                <thead>
                  <tr>
                    <th scope="col">Actor</th>
                    <th scope="col">Action</th>
                    <th scope="col">Table</th>
                    <th scope="col">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLog?.data?.map((log: { id: string; actor_name: string; action: string; table_name: string; created_at: string }) => (
                    <tr key={log.id}>
                      <td>{log.actor_name ?? 'System'}</td>
                      <td><span className={`badge ${log.action === 'INSERT' ? 'badge-success' : log.action === 'DELETE' ? 'badge-danger' : 'badge-warning'}`}>{log.action}</span></td>
                      <td style={{ color: 'var(--text-secondary)' }}>{log.table_name}</td>
                      <td style={{ color: 'var(--text-muted)' }}>{new Date(log.created_at).toLocaleString('en-IN')}</td>
                    </tr>
                  ))}
                  {!auditLog?.data?.length && (
                    <tr><td colSpan={4} className="text-center py-8" style={{ color: 'var(--text-muted)' }}>No audit log entries</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {tab === 'automation' && (
        <div className="space-y-4">
          <div className="card p-5">
            <h2 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Automation Health Log</h2>
            <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
              Records all n8n workflow executions and direct-API fallback triggers.
            </p>
            <div className="table-wrapper">
              <table aria-label="Automation logs">
                <thead>
                  <tr>
                    <th scope="col">Workflow</th>
                    <th scope="col">Trigger</th>
                    <th scope="col">Status</th>
                    <th scope="col">Time</th>
                    <th scope="col">Error</th>
                  </tr>
                </thead>
                <tbody>
                  {automationLogs?.data?.map((log: { id: string; workflow_name: string; trigger_source: string; status: string; created_at: string; error_message: string }) => (
                    <tr key={log.id}>
                      <td className="font-medium">{log.workflow_name}</td>
                      <td>
                        <span className={`badge ${log.trigger_source === 'n8n' ? 'badge-brand' : 'badge-info'}`}>
                          {log.trigger_source}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${log.status === 'success' ? 'badge-success' : log.status === 'failed' ? 'badge-danger' : 'badge-warning'}`}>
                          {log.status}
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-muted)' }}>{new Date(log.created_at).toLocaleString('en-IN')}</td>
                      <td className="text-xs" style={{ color: 'var(--color-danger)' }}>{log.error_message ?? '—'}</td>
                    </tr>
                  ))}
                  {!automationLogs?.data?.length && (
                    <tr><td colSpan={5} className="text-center py-8" style={{ color: 'var(--text-muted)' }}>No automation runs yet</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
