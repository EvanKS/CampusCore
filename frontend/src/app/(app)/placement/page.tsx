'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useToast } from '@/components/ui/Toaster';
import { useAuth } from '@/contexts/AuthContext';
import { DEMO_PLACEMENTS } from '@/lib/demoData';
import { Briefcase, Plus, X, Loader2, Edit3, Trash2 } from 'lucide-react';

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="page-header mb-0">
          <h1 className="page-title flex items-center gap-2">
            <Briefcase className="w-7 h-7 text-blue-600 dark:text-blue-400" />
            Placement Application Tracker
          </h1>
          <p className="page-subtitle">Track internship & job applications, interview stages, and offers.</p>
        </div>
        <button className="btn-primary shrink-0 shadow-md" onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4" />
          Add Application
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Applied', value: stats.total, color: 'var(--color-brand-primary)' },
          { label: 'Interviews', value: stats.interviews, color: 'var(--color-warning)' },
          { label: 'Offers Received', value: stats.offers, color: 'var(--color-success)' },
          { label: 'Rejected', value: stats.rejected, color: 'var(--color-danger)' },
        ].map(stat => (
          <div key={stat.label} className="stat-card">
            <p className="text-2xl sm:text-3xl font-black" style={{ color: stat.color }}>{stat.value}</p>
            <p className="text-xs font-bold uppercase tracking-wider mt-1" style={{ color: 'var(--text-muted)' }}>{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Modal Form */}
      {(showForm || editApp) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in" role="dialog" aria-modal="true">
          <div className="card w-full max-w-lg p-6 animate-slide-up shadow-xl">
            <div className="flex items-center justify-between mb-4 border-b pb-3" style={{ borderColor: 'var(--border-default)' }}>
              <h3 className="font-extrabold text-lg" style={{ color: 'var(--text-primary)' }}>
                {editApp ? 'Edit Application' : 'New Job / Internship Application'}
              </h3>
              <button className="btn-ghost p-1" onClick={() => { setShowForm(false); setEditApp(null); }}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="pl-company" className="label">Company Name *</label>
                <input id="pl-company" className="input font-semibold" placeholder="e.g. Google, Microsoft" value={editApp?.company_name ?? form.companyName}
                  onChange={e => editApp ? setEditApp({...editApp, company_name: e.target.value}) : setForm(p => ({...p, companyName: e.target.value}))} />
              </div>
              <div>
                <label htmlFor="pl-role" className="label">Job Role *</label>
                <input id="pl-role" className="input font-semibold" placeholder="e.g. Software Engineer Intern" value={editApp?.role ?? form.role}
                  onChange={e => editApp ? setEditApp({...editApp, role: e.target.value}) : setForm(p => ({...p, role: e.target.value}))} />
              </div>
              <div>
                <label htmlFor="pl-status" className="label">Application Stage</label>
                <select id="pl-status" className="input font-semibold" value={editApp?.status ?? form.status}
                  onChange={e => editApp ? setEditApp({...editApp, status: e.target.value}) : setForm(p => ({...p, status: e.target.value}))}>
                  {['applied','screening','interview','offer','rejected','withdrawn'].map(s =>
                    <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                  )}
                </select>
              </div>
              <div>
                <label htmlFor="pl-next" className="label">Next Step / Date</label>
                <input id="pl-next" className="input font-medium" placeholder="e.g. Technical Interview" value={editApp?.next_step ?? form.nextStep}
                  onChange={e => editApp ? setEditApp({...editApp, next_step: e.target.value}) : setForm(p => ({...p, nextStep: e.target.value}))} />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="pl-notes" className="label">Notes / CTC Details</label>
                <textarea id="pl-notes" className="input font-medium" rows={2} placeholder="Package details, interview notes..." value={editApp?.notes ?? form.notes}
                  onChange={e => editApp ? setEditApp({...editApp, notes: e.target.value}) : setForm(p => ({...p, notes: e.target.value}))} />
              </div>
            </div>
            <div className="flex gap-3 mt-5 pt-3 border-t" style={{ borderColor: 'var(--border-default)' }}>
              <button className="btn-secondary flex-1" onClick={() => { setShowForm(false); setEditApp(null); }}>Cancel</button>
              <button className="btn-primary flex-1 font-bold"
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
                {createMutation.isPending || updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : editApp ? 'Save Application' : 'Add Application'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Applications Table */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
        </div>
      ) : apps.length === 0 ? (
        <div className="card p-12 text-center">
          <Briefcase className="w-12 h-12 mx-auto mb-3 text-slate-400" />
          <p className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>No applications recorded</p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Click "Add Application" to track your job search.</p>
        </div>
      ) : (
        <div className="table-wrapper">
          <table aria-label="Placement applications">
            <thead>
              <tr>
                <th scope="col">Company</th>
                <th scope="col">Role</th>
                <th scope="col">Stage</th>
                <th scope="col">Next Step</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {apps.map((app) => (
                <tr key={app.id}>
                  <td className="font-extrabold text-sm" style={{ color: 'var(--text-primary)' }}>{app.company_name}</td>
                  <td className="font-semibold">{app.role}</td>
                  <td><span className={`badge ${statusColors[app.status] || ''} capitalize font-bold`}>{app.status}</span></td>
                  <td className="font-medium" style={{ color: 'var(--text-secondary)' }}>{app.next_step ?? '—'}</td>
                  <td>
                    <div className="flex gap-1">
                      <button className="btn-ghost p-1.5" onClick={() => setEditApp(app)} aria-label={`Edit ${app.company_name}`}>
                        <Edit3 className="w-4 h-4 text-slate-500 hover:text-blue-600" />
                      </button>
                      <button className="btn-ghost p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30" onClick={() => {
                        if (confirm('Delete this application entry?')) {
                          if (isDemoMode) {
                            setDemoApps(prev => prev.filter(a => a.id !== app.id));
                            toast('success', 'Application removed');
                          } else {
                            deleteMutation.mutate(app.id);
                          }
                        }
                      }} aria-label={`Delete ${app.company_name}`}>
                        <Trash2 className="w-4 h-4" />
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
