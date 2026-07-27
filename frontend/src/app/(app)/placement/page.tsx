'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useToast } from '@/components/ui/Toaster';
import { useAuth } from '@/contexts/AuthContext';
import { DEMO_PLACEMENTS } from '@/lib/demoData';
import { Briefcase, Plus, X, Loader2, Edit3 } from 'lucide-react';

interface Application {
  id: string;
  company_name: string;
  role: string;
  status: string;
  applied_at?: string;
  next_step?: string;
  notes?: string;
}

const statusColors: Record<string, string> = {
  applied: 'badge-info',
  screening: 'badge-brand',
  interview: 'badge-warning',
  offer: 'badge-success',
  rejected: 'badge-danger',
  withdrawn: '',
};

export default function PlacementPage() {
  const { isDemoMode } = useAuth();
  const toast = useToast();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editApp, setEditApp] = useState<Application | null>(null);
  const [demoApps, setDemoApps] = useState<Application[]>(DEMO_PLACEMENTS as Application[]);
  const [form, setForm] = useState({
    companyName: '', role: '', status: 'applied',
    appliedAt: '', nextStep: '', notes: '',
  });

  const { data, isLoading } = useQuery({
    queryKey: ['placement'],
    queryFn: () => api.get('/placement').then(r => r.data),
    enabled: !isDemoMode,
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof form) => api.post('/placement', data),
    onSuccess: () => {
      toast('success', 'Application added!');
      qc.invalidateQueries({ queryKey: ['placement'] });
      setShowForm(false);
      setForm({ companyName: '', role: '', status: 'applied', appliedAt: '', nextStep: '', notes: '' });
    },
    onError: (err: { response?: { data?: { error?: string } }; message?: string }) => {
      toast('error', err?.response?.data?.error || err?.message || 'Failed to add application');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<typeof form> }) =>
      api.patch(`/placement/${id}`, data),
    onSuccess: () => {
      toast('success', 'Updated!');
      qc.invalidateQueries({ queryKey: ['placement'] });
      setEditApp(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/placement/${id}`),
    onSuccess: () => {
      toast('success', 'Application removed');
      qc.invalidateQueries({ queryKey: ['placement'] });
    },
  });

  const handleAddSubmit = () => {
    if (!form.companyName || !form.role) return;
    if (isDemoMode) {
      const newApp: Application = {
        id: `place-demo-${Date.now()}`,
        company_name: form.companyName,
        role: form.role,
        status: form.status,
        applied_at: form.appliedAt || undefined,
        next_step: form.nextStep || undefined,
        notes: form.notes || undefined,
      };
      setDemoApps(prev => [newApp, ...prev]);
      toast('success', 'Application added!');
      setShowForm(false);
      setForm({ companyName: '', role: '', status: 'applied', appliedAt: '', nextStep: '', notes: '' });
    } else {
      createMutation.mutate(form);
    }
  };

  const apps: Application[] = isDemoMode ? demoApps : (data?.data ?? []);

  // Stats
  const stats = {
    total: apps.length,
    interviews: apps.filter(a => a.status === 'interview').length,
    offers: apps.filter(a => a.status === 'offer').length,
    rejected: apps.filter(a => a.status === 'rejected').length,
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1 page-header mb-0">
          <h1 className="page-title flex items-center gap-2">
            <Briefcase className="w-6 h-6" style={{ color: 'var(--color-brand-primary)' }} />
            Placement Prep Tracker
          </h1>
          <p className="page-subtitle">Track your job applications and interview progress</p>
        </div>
        <button className="btn-primary shrink-0" onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4" />
          Add Application
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total', value: stats.total, color: 'var(--color-brand-primary)' },
          { label: 'Interviews', value: stats.interviews, color: 'var(--color-warning)' },
          { label: 'Offers', value: stats.offers, color: 'var(--color-success)' },
          { label: 'Rejected', value: stats.rejected, color: 'var(--color-danger)' },
        ].map(stat => (
          <div key={stat.label} className="stat-card">
            <p className="text-2xl font-bold" style={{ color: stat.color }}>{stat.value}</p>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Form */}
      {(showForm || editApp) && (
        <div className="card p-6 animate-slide-up">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
              {editApp ? 'Edit Application' : 'New Application'}
            </h3>
            <button className="btn-ghost p-1" onClick={() => { setShowForm(false); setEditApp(null); }}>
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="pl-company" className="label">Company *</label>
              <input id="pl-company" className="input" placeholder="Company name" value={editApp?.company_name ?? form.companyName}
                onChange={e => editApp ? setEditApp({...editApp, company_name: e.target.value}) : setForm(p => ({...p, companyName: e.target.value}))} />
            </div>
            <div>
              <label htmlFor="pl-role" className="label">Role *</label>
              <input id="pl-role" className="input" placeholder="Job title" value={editApp?.role ?? form.role}
                onChange={e => editApp ? setEditApp({...editApp, role: e.target.value}) : setForm(p => ({...p, role: e.target.value}))} />
            </div>
            <div>
              <label htmlFor="pl-status" className="label">Status</label>
              <select id="pl-status" className="input" value={editApp?.status ?? form.status}
                onChange={e => editApp ? setEditApp({...editApp, status: e.target.value}) : setForm(p => ({...p, status: e.target.value}))}>
                {['applied','screening','interview','offer','rejected','withdrawn'].map(s =>
                  <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                )}
              </select>
            </div>
            <div>
              <label htmlFor="pl-next" className="label">Next Step</label>
              <input id="pl-next" className="input" placeholder="e.g., Technical Interview" value={editApp?.next_step ?? form.nextStep}
                onChange={e => editApp ? setEditApp({...editApp, next_step: e.target.value}) : setForm(p => ({...p, nextStep: e.target.value}))} />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="pl-notes" className="label">Notes</label>
              <textarea id="pl-notes" className="input" rows={2} placeholder="Additional notes..." value={editApp?.notes ?? form.notes}
                onChange={e => editApp ? setEditApp({...editApp, notes: e.target.value}) : setForm(p => ({...p, notes: e.target.value}))} />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button className="btn-secondary flex-1" onClick={() => { setShowForm(false); setEditApp(null); }}>Cancel</button>
            <button className="btn-primary flex-1"
              disabled={createMutation.isPending || updateMutation.isPending}
              onClick={() => {
                if (editApp) {
                  if (isDemoMode) {
                    setDemoApps(prev => prev.map(a => a.id === editApp.id ? { ...a, status: editApp.status, next_step: editApp.next_step, notes: editApp.notes } : a));
                    toast('success', 'Updated!');
                    setEditApp(null);
                  } else {
                    updateMutation.mutate({ id: editApp.id, data: { status: editApp.status, nextStep: editApp.next_step, notes: editApp.notes } });
                  }
                } else {
                  handleAddSubmit();
                }
              }}>
              {createMutation.isPending || updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : editApp ? 'Save' : 'Add'}
            </button>
          </div>
        </div>
      )}

      {/* Applications */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--color-brand-primary)' }} />
        </div>
      ) : apps.length === 0 ? (
        <div className="card p-12 text-center">
          <Briefcase className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
          <p style={{ color: 'var(--text-muted)' }}>No applications yet. Start tracking your job search!</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table aria-label="Placement applications">
            <thead>
              <tr>
                <th scope="col">Company</th>
                <th scope="col">Role</th>
                <th scope="col">Status</th>
                <th scope="col">Next Step</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {apps.map((app) => (
                <tr key={app.id}>
                  <td className="font-medium">{app.company_name}</td>
                  <td>{app.role}</td>
                  <td><span className={`badge ${statusColors[app.status] || ''} capitalize`}>{app.status}</span></td>
                  <td style={{ color: 'var(--text-secondary)' }}>{app.next_step ?? '—'}</td>
                  <td>
                    <div className="flex gap-1">
                      <button className="btn-ghost p-1.5" onClick={() => setEditApp(app)} aria-label={`Edit ${app.company_name}`}>
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button className="btn-ghost p-1.5 text-red-500" onClick={() => {
                        if (confirm('Delete this application?')) {
                          if (isDemoMode) {
                            setDemoApps(prev => prev.filter(a => a.id !== app.id));
                            toast('success', 'Application removed');
                          } else {
                            deleteMutation.mutate(app.id);
                          }
                        }
                      }} aria-label={`Delete ${app.company_name}`}>
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
