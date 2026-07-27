'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useToast } from '@/components/ui/Toaster';
import { Building2, Save, Loader2, Info } from 'lucide-react';

interface Institution {
  id: string;
  name: string;
  domain?: string;
  attendance_threshold: number;
  settings: Record<string, unknown>;
  created_at: string;
}

export default function AdminInstitutionPage() {
  const toast = useToast();
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: '', attendanceThreshold: 75 });

  const { data: institution, isLoading } = useQuery({
    queryKey: ['admin', 'institution'],
    queryFn: (): Promise<Institution> => api.get('/admin/institution').then(r => r.data as Institution),
  });

  useEffect(() => {
    if (institution) {
      setForm({ name: institution.name, attendanceThreshold: institution.attendance_threshold });
    }
  }, [institution]);

  const updateMutation = useMutation({
    mutationFn: (d: typeof form) =>
      api.patch('/admin/institution', {
        name: d.name,
        attendanceThreshold: d.attendanceThreshold,
      }),
    onSuccess: () => {
      toast('success', 'Institution settings saved!');
      qc.invalidateQueries({ queryKey: ['admin', 'institution'] });
      setEditing(false);
    },
    onError: () => toast('error', 'Failed to save settings'),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <div className="page-header">
        <h1 className="page-title flex items-center gap-2">
          <Building2 className="w-7 h-7 text-blue-600 dark:text-blue-400" />
          Institution Settings
        </h1>
        <p className="page-subtitle">Configure global institution settings and attendance risk thresholds.</p>
      </div>

      <div className="card p-6 space-y-6 shadow-sm">
        {/* Info banner */}
        <div className="flex items-start gap-3 rounded-xl p-4 bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60">
          <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
          <p className="text-xs sm:text-sm font-medium text-blue-900 dark:text-blue-200">
            Attendance threshold controls when automated WhatsApp risk alerts trigger for student and parent profiles.
          </p>
        </div>

        {/* Institution name */}
        <div>
          <label className="label" htmlFor="inst-name">Institution Name</label>
          {editing ? (
            <input
              id="inst-name"
              className="input font-semibold"
              value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
            />
          ) : (
            <p className="text-base font-extrabold py-1" style={{ color: 'var(--text-primary)' }}>
              {institution?.name ?? '—'}
            </p>
          )}
        </div>

        {/* Domain */}
        <div>
          <label className="label">Domain</label>
          <p className="text-sm font-medium py-1" style={{ color: 'var(--text-muted)' }}>
            {institution?.domain ?? 'Not configured'}
          </p>
        </div>

        {/* Attendance threshold */}
        <div>
          <label className="label" htmlFor="inst-threshold">
            Attendance Risk Threshold (%)
          </label>
          {editing ? (
            <div className="space-y-2">
              <input
                id="inst-threshold"
                type="number"
                className="input font-bold"
                min={0}
                max={100}
                value={form.attendanceThreshold}
                onChange={e => setForm(p => ({ ...p, attendanceThreshold: parseInt(e.target.value, 10) || 75 }))}
              />
              <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                Students below this percentage will be flagged as at-risk.
              </p>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <span className="text-3xl font-black" style={{ color: institution && institution.attendance_threshold < 75 ? 'var(--color-warning)' : 'var(--color-brand-primary)' }}>
                {institution?.attendance_threshold ?? 75}%
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">threshold</span>
            </div>
          )}
        </div>

        {/* Created at */}
        <div>
          <label className="label">Created Date</label>
          <p className="text-sm font-medium py-1" style={{ color: 'var(--text-muted)' }}>
            {institution?.created_at
              ? new Date(institution.created_at).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })
              : '—'}
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-3 border-t" style={{ borderColor: 'var(--border-default)' }}>
          {editing ? (
            <>
              <button className="btn-secondary flex-1" onClick={() => setEditing(false)}>Cancel</button>
              <button
                className="btn-primary flex-1 font-bold gap-2 shadow-md"
                disabled={updateMutation.isPending || !form.name.trim()}
                onClick={() => updateMutation.mutate(form)}
              >
                {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Changes
              </button>
            </>
          ) : (
            <button className="btn-secondary font-bold" onClick={() => setEditing(true)}>
              Edit Settings
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
