'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useToast } from '@/components/ui/Toaster';
import {
  Users, Upload, Search, Loader2, X, Shield, Trash2,
  ChevronLeft, ChevronRight, CheckCircle, AlertCircle,
} from 'lucide-react';
import { useRef } from 'react';

interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
  phone?: string;
  is_active: boolean;
  created_at: string;
}

const ROLES = ['student', 'teacher', 'parent', 'admin'] as const;
const roleBadge: Record<string, string> = {
  student: 'badge-brand',
  teacher: 'badge-success',
  parent: 'badge-info',
  admin: 'badge-warning',
};

export default function AdminUsersPage() {
  const toast = useToast();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [page, setPage] = useState(1);
  const [showImport, setShowImport] = useState(false);
  const [importResult, setImportResult] = useState<{ created: number; skipped: number; errors: string[] } | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'users', page, search, roleFilter],
    queryFn: () => api.get(`/admin/users?page=${page}&limit=20&search=${encodeURIComponent(search)}&role=${roleFilter}`).then(r => r.data),
  });

  const importMutation = useMutation({
    mutationFn: (file: File) => {
      const fd = new FormData();
      fd.append('file', file);
      return api.post('/admin/import-users', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }).then(r => r.data);
    },
    onSuccess: (result) => {
      setImportResult(result);
      qc.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
    onError: (err: { response?: { data?: { error?: string; message?: string } }; message?: string }) => {
      const msg = err?.response?.data?.error || err?.response?.data?.message || err?.message || 'Import failed';
      toast('error', msg);
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => api.patch(`/users/${id}`, { isActive }),
    onSuccess: (_, variables) => {
      toast('success', variables.isActive ? 'User activated' : 'User deactivated');
      qc.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
    onError: () => toast('error', 'Failed to update user status'),
  });

  const deleteUserMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/users/${id}`),
    onSuccess: () => {
      toast('success', 'User deleted successfully');
      qc.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
    onError: (err: { response?: { data?: { error?: string } } }) => {
      toast('error', err?.response?.data?.error || 'Failed to delete user');
    },
  });

  const users: User[] = data?.data ?? [];
  const totalPages = Math.ceil((data?.total ?? 0) / 20) || 1;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <h1 className="page-title flex items-center gap-2">
          <Users className="w-6 h-6" style={{ color: 'var(--color-brand-primary)' }} />
          User Management
        </h1>
        <p className="page-subtitle">Manage all users in your institution</p>
      </div>

      {/* Actions bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
          <input
            type="search"
            className="input pl-9"
            placeholder="Search by name or email..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            aria-label="Search users"
          />
        </div>
        <select
          className="input w-auto"
          value={roleFilter}
          onChange={e => { setRoleFilter(e.target.value); setPage(1); }}
          aria-label="Filter by role"
        >
          <option value="">All Roles</option>
          {ROLES.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}s</option>)}
        </select>
        <button className="btn-secondary gap-2" onClick={() => setShowImport(p => !p)}>
          <Upload className="w-4 h-4" />
          CSV Import
        </button>
      </div>

      {/* CSV Import section */}
      {showImport && (
        <div className="card p-5 space-y-4 animate-slide-up">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Bulk CSV Import</h2>
            <button className="btn-ghost p-1.5" onClick={() => { setShowImport(false); setImportResult(null); }} aria-label="Close">
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            CSV columns: <code className="px-1 rounded" style={{ background: 'var(--bg-input)' }}>email, full_name, role, password (optional), phone (optional)</code>
          </p>
          <div className="flex gap-3">
            <input
              ref={fileRef}
              type="file"
              accept=".csv"
              className="hidden"
              id="csv-upload"
              onChange={e => {
                const file = e.target.files?.[0];
                if (file) importMutation.mutate(file);
              }}
            />
            <button
              className="btn-primary gap-2"
              disabled={importMutation.isPending}
              onClick={() => fileRef.current?.click()}
            >
              {importMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {importMutation.isPending ? 'Importing…' : 'Choose CSV File'}
            </button>
          </div>
          {importResult && (
            <div className="rounded-lg p-4 space-y-2" style={{ background: 'var(--bg-input)' }}>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-emerald-500" />
                <span style={{ color: 'var(--text-primary)' }}>{importResult.created} users created</span>
              </div>
              {importResult.skipped > 0 && (
                <div className="flex items-center gap-2 text-sm">
                  <AlertCircle className="w-4 h-4 text-amber-500" />
                  <span style={{ color: 'var(--text-secondary)' }}>{importResult.skipped} rows skipped</span>
                </div>
              )}
              {importResult.errors.slice(0, 3).map((e, i) => (
                <p key={i} className="text-xs" style={{ color: 'var(--color-danger)' }}>{e}</p>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Users table */}
      <div className="card overflow-hidden">
        <div className="table-wrapper border-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--color-brand-primary)' }} />
            </div>
          ) : (
            <table aria-label="Users list">
              <thead>
                <tr>
                  <th scope="col">Name</th>
                  <th scope="col">Email</th>
                  <th scope="col">Role</th>
                  <th scope="col">Phone</th>
                  <th scope="col">Status</th>
                  <th scope="col">Joined</th>
                  <th scope="col"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td>
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                          style={{ background: 'linear-gradient(135deg, var(--color-brand-primary), hsl(286,75%,60%))' }}
                          aria-hidden="true"
                        >
                          {u.full_name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>{u.full_name}</span>
                      </div>
                    </td>
                    <td style={{ color: 'var(--text-secondary)' }}>{u.email}</td>
                    <td>
                      <span className={`badge ${roleBadge[u.role] ?? 'badge-brand'} capitalize`}>
                        {u.role === 'admin' && <Shield className="w-3 h-3" />}
                        {u.role}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-muted)' }}>{u.phone ?? '—'}</td>
                    <td>
                      <span className={`badge ${u.is_active ? 'badge-success' : 'badge-danger'}`}>
                        {u.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-muted)' }}>{new Date(u.created_at).toLocaleDateString('en-IN')}</td>
                    <td>
                      {u.role !== 'admin' && (
                        <div className="flex items-center gap-1">
                          <button
                            className={`btn-ghost text-xs px-2 py-1 ${u.is_active ? 'text-rose-500 hover:text-rose-600' : 'text-emerald-500 hover:text-emerald-600 font-semibold'}`}
                            onClick={() => {
                              const action = u.is_active ? 'Deactivate' : 'Activate';
                              if (confirm(`${action} ${u.full_name}?`)) {
                                toggleStatusMutation.mutate({ id: u.id, isActive: !u.is_active });
                              }
                            }}
                            aria-label={`${u.is_active ? 'Deactivate' : 'Activate'} ${u.full_name}`}
                          >
                            {u.is_active ? 'Deactivate' : 'Activate'}
                          </button>
                          <button
                            className="btn-ghost text-xs px-2 py-1 text-red-500 hover:text-red-700 flex items-center gap-1"
                            onClick={() => {
                              if (confirm(`Permanently delete user ${u.full_name} (${u.email})? This action cannot be undone.`)) {
                                deleteUserMutation.mutate(u.id);
                              }
                            }}
                            aria-label={`Delete ${u.full_name}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Delete
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-12" style={{ color: 'var(--text-muted)' }}>
                      No users found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t" style={{ borderColor: 'var(--border-default)' }}>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Page {page} of {totalPages} · {data?.total ?? 0} users
            </p>
            <div className="flex gap-2">
              <button
                className="btn-secondary px-3 py-1.5"
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
                aria-label="Previous page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                className="btn-secondary px-3 py-1.5"
                disabled={page >= totalPages}
                onClick={() => setPage(p => p + 1)}
                aria-label="Next page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
