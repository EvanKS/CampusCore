'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Users, TrendingUp, Shield } from 'lucide-react';

import { PageHeader } from '@/components/layout/PageHeader';

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
      <PageHeader
        title="Institution Analytics & Audit Hub"
        category="Management"
        breadcrumb="Analytics Overview"
      />

      {/* Tab switcher */}
      <div className="flex gap-1.5 p-1.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm w-fit" role="tablist">
        {(['overview', 'automation'] as AnalyticsTab[]).map(t => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            className={`px-5 py-2.5 rounded-xl text-xs font-black capitalize transition-all ${
              tab === t
                ? 'bg-purple-600 text-white shadow-md shadow-purple-500/20'
                : 'text-slate-600 dark:text-slate-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-slate-800'
            }`}
            onClick={() => setTab(t)}
          >
            {t === 'overview' ? 'Institution Overview' : 'Automation Health'}
          </button>
        ))}
      </div>


      {tab === 'overview' && (
        <>
          {/* Key metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {usersByRole.map((r: { role: string; count: number }) => {
              const icons: Record<string, React.ReactNode> = {
                student: <Users className="w-5 h-5 text-blue-500" />,
                teacher: <TrendingUp className="w-5 h-5 text-emerald-500" />,
                parent: <Users className="w-5 h-5 text-amber-500" />,
                admin: <Shield className="w-5 h-5 text-purple-500" />,
              };
              return (
                <div key={r.role} className="stat-card">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl bg-[var(--bg-input)] flex items-center justify-center">
                      {icons[r.role] || <Users className="w-5 h-5" />}
                    </div>
                  </div>
                  <p className="text-2xl sm:text-3xl font-black" style={{ color: 'var(--text-primary)' }}>{r.count}</p>
                  <p className="text-xs font-bold uppercase tracking-wider mt-1 capitalize" style={{ color: 'var(--text-muted)' }}>{r.role}s</p>
                </div>
              );
            })}
          </div>

          {/* Avg attendance + task breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card p-5">
              <h2 className="font-extrabold text-base mb-4 tracking-tight" style={{ color: 'var(--text-primary)' }}>Task Status Ratios</h2>
              <div className="space-y-3.5">
                {tasksByStatus.map((s: { status: string; count: number }) => {
                  const total = tasksByStatus.reduce((sum: number, t: { count: number }) => sum + Number(t.count), 0);
                  const pct = total > 0 ? Math.round((Number(s.count) / total) * 100) : 0;
                  const colors: Record<string, string> = {
                    pending: '#0284c7',
                    in_progress: 'var(--color-brand-primary)',
                    completed: 'var(--color-success)',
                    overdue: 'var(--color-danger)',
                  };
                  return (
                    <div key={s.status}>
                      <div className="flex items-center justify-between mb-1 text-sm font-semibold">
                        <span className="capitalize" style={{ color: 'var(--text-secondary)' }}>
                          {s.status.replace('_', ' ')}
                        </span>
                        <span className="font-bold" style={{ color: 'var(--text-primary)' }}>
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
              <h2 className="font-extrabold text-base mb-4 tracking-tight" style={{ color: 'var(--text-primary)' }}>Core Campus Health Metrics</h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3.5 rounded-xl border border-[var(--border-default)]" style={{ background: 'var(--bg-input)' }}>
                  <span className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>Avg. Attendance Percentage</span>
                  <span className="text-xl font-black" style={{ color: analytics?.avgAttendance >= 75 ? 'var(--color-success)' : 'var(--color-danger)' }}>
                    {analytics?.avgAttendance ?? '—'}%
                  </span>
                </div>
                <div className="flex items-center justify-between p-3.5 rounded-xl border border-[var(--border-default)]" style={{ background: 'var(--bg-input)' }}>
                  <span className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>Total Campus Notices</span>
                  <span className="text-xl font-black" style={{ color: 'var(--text-brand)' }}>
                    {analytics?.noticesTotal ?? '—'}
                  </span>
                </div>
                {automationHealth.map((h: { status: string; count: number }) => (
                  <div key={h.status} className="flex items-center justify-between p-3.5 rounded-xl border border-[var(--border-default)]" style={{ background: 'var(--bg-input)' }}>
                    <span className="text-sm font-semibold capitalize" style={{ color: 'var(--text-secondary)' }}>
                      Automation Webhooks {h.status} (7d)
                    </span>
                    <span className="text-xl font-black" style={{ color: h.status === 'success' ? 'var(--color-success)' : 'var(--color-danger)' }}>
                      {h.count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Audit log */}
          <div className="card">
            <div className="p-5 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-default)' }}>
              <h2 className="font-extrabold text-base tracking-tight" style={{ color: 'var(--text-primary)' }}>System Audit Log</h2>
              <span className="text-xs font-semibold text-slate-400">Immutable Trigger Logs</span>
            </div>
            <div className="table-wrapper border-0">
              <table aria-label="Audit log">
                <thead>
                  <tr>
                    <th scope="col">Actor</th>
                    <th scope="col">Action</th>
                    <th scope="col">Table</th>
                    <th scope="col">Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLog?.data?.map((log: { id: string; actor_name: string; action: string; table_name: string; created_at: string }) => (
                    <tr key={log.id}>
                      <td className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>{log.actor_name ?? 'System'}</td>
                      <td><span className={`badge ${log.action === 'INSERT' ? 'badge-success' : log.action === 'DELETE' ? 'badge-danger' : 'badge-warning'} font-bold`}>{log.action}</span></td>
                      <td className="font-semibold" style={{ color: 'var(--text-secondary)' }}>{log.table_name}</td>
                      <td className="font-medium" style={{ color: 'var(--text-muted)' }}>{new Date(log.created_at).toLocaleString('en-IN')}</td>
                    </tr>
                  ))}
                  {!auditLog?.data?.length && (
                    <tr><td colSpan={4} className="text-center py-8 font-medium" style={{ color: 'var(--text-muted)' }}>No audit log entries recorded</td></tr>
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
            <h2 className="font-extrabold text-base mb-2 tracking-tight" style={{ color: 'var(--text-primary)' }}>Automation Execution Health</h2>
            <p className="text-xs font-medium mb-4" style={{ color: 'var(--text-secondary)' }}>
              Execution records for n8n webhooks and direct-API fallback dispatches.
            </p>
            <div className="table-wrapper">
              <table aria-label="Automation logs">
                <thead>
                  <tr>
                    <th scope="col">Workflow</th>
                    <th scope="col">Trigger Source</th>
                    <th scope="col">Execution Status</th>
                    <th scope="col">Time</th>
                    <th scope="col">Error Message</th>
                  </tr>
                </thead>
                <tbody>
                  {automationLogs?.data?.map((log: { id: string; workflow_name: string; trigger_source: string; status: string; created_at: string; error_message: string }) => (
                    <tr key={log.id}>
                      <td className="font-extrabold text-sm">{log.workflow_name}</td>
                      <td>
                        <span className={`badge ${log.trigger_source === 'n8n' ? 'badge-brand' : 'badge-info'} font-bold`}>
                          {log.trigger_source}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${log.status === 'success' ? 'badge-success' : log.status === 'failed' ? 'badge-danger' : 'badge-warning'} font-bold`}>
                          {log.status}
                        </span>
                      </td>
                      <td className="font-medium" style={{ color: 'var(--text-muted)' }}>{new Date(log.created_at).toLocaleString('en-IN')}</td>
                      <td className="text-xs font-medium" style={{ color: 'var(--color-danger)' }}>{log.error_message ?? '—'}</td>
                    </tr>
                  ))}
                  {!automationLogs?.data?.length && (
                    <tr><td colSpan={5} className="text-center py-8 font-medium" style={{ color: 'var(--text-muted)' }}>No automation executions logged yet</td></tr>
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
