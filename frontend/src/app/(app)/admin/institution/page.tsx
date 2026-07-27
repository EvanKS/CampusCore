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

  // Sync form when data loads (React Query v5 removed onSuccess)
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
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--color-brand-primary)' }} />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <div className="page-header">
        <h1 className="page-title flex items-center gap-2">
          <Building2 className="w-6 h-6" style={{ color: 'var(--color-brand-primary)' }} />
          Institution Settings
        </h1>
        <p className="page-subtitle">Configure your institution's global settings</p>
      </div>

      <div className="card p-6 space-y-6">
        {/* Info banner */}
        <div className="flex items-start gap-3 rounded-lg p-4" style={{ background: 'var(--bg-badge)' }}>
          <Info className="w-4 h-4 mt-0.5 shrink-0" style={{ color: 'var(--color-brand-primary)' }} />
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            These settings apply institution-wide. Attendance threshold controls when automatic
            WhatsApp risk alerts are sent to students and parents.
          </p>
        </div>

        {/* Institution name */}
        <div>
          <label className="label" htmlFor="inst-name">Institution Name</label>
          {editing ? (
            <input
              id="inst-name"
              className="input"
              value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
            />
          ) : (
            <p className="text-sm font-medium py-2" style={{ color: 'var(--text-primary)' }}>
              {institution?.name ?? '—'}
            </p>
          )}
        </div>

        {/* Domain */}
        <div>
          <label className="label">Domain</label>
          <p className="text-sm py-2" style={{ color: 'var(--text-muted)' }}>
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
                className="input"
                min={0}
                max={100}
                value={form.attendanceThreshold}
                onChange={e => setForm(p => ({ ...p, attendanceThreshold: parseInt(e.target.value, 10) || 75 }))}
              />
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Students below this % attendance will receive WhatsApp risk alerts.
              </p>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <span className="text-2xl font-bold" style={{ color: institution && institution.attendance_threshold < 75 ? 'var(--color-warning)' : 'var(--color-brand-primary)' }}>
                {institution?.attendance_threshold ?? 75}%
              </span>
              <span className="text-sm" style={{ color: 'var(--text-muted)' }}>threshold</span>
            </div>
          )}
        </div>

        {/* Created at */}
        <div>
          <label className="label">Created</label>
          <p className="text-sm py-2" style={{ color: 'var(--text-muted)' }}>
            {institution?.created_at
              ? new Date(institution.created_at).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })
              : '—'}
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          {editing ? (
            <>
              <button className="btn-secondary" onClick={() => setEditing(false)}>Cancel</button>
              <button
                className="btn-primary gap-2"
                disabled={updateMutation.isPending || !form.name.trim()}
                onClick={() => updateMutation.mutate(form)}
              >
                {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Changes
              </button>
            </>
          ) : (
            <button className="btn-secondary" onClick={() => setEditing(true)}>
              Edit Settings
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
