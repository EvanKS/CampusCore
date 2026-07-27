'use client';

import { AuthProvider } from '@/contexts/AuthContext';
import { Sidebar } from '@/components/layout/Sidebar';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { FlaskConical } from 'lucide-react';

function DemoBanner() {
  const { isDemoMode } = useAuth();
  if (!isDemoMode) return null;

  return (
    <div
      className="flex items-center justify-center gap-2 py-2 px-4 text-xs font-semibold tracking-wide border-b border-amber-500/20"
      style={{
        background: 'linear-gradient(90deg, #1e3a8a, #0f172a)',
        color: '#fef08a',
      }}
      role="status"
      aria-label="Demo mode active"
    >
      <FlaskConical className="w-3.5 h-3.5 text-amber-400 shrink-0" aria-hidden="true" />
      <span>Demo Mode Active — Interactive UI preview with pre-populated demo data.</span>
    </div>
  );
}

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-page)' }}>
        <div className="text-center">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4 bg-gradient-to-br from-blue-600 to-indigo-800 shadow-xl border border-blue-400/30">
            C
          </div>
          <div className="spinner w-6 h-6 mx-auto" style={{ color: 'var(--color-brand-primary)' }} />
          <p className="text-xs font-semibold mt-3 tracking-wider uppercase" style={{ color: 'var(--text-muted)' }}>
            Loading CampusFlow...
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="flex min-h-screen flex-col">
      <DemoBanner />
      <div className="flex flex-1 min-h-0">
        <Sidebar />
        <main
          className="flex-1 min-w-0 transition-all duration-200"
          style={{ paddingLeft: 'var(--sidebar-width)' }}
          id="main-content"
        >
          <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AuthGuard>{children}</AuthGuard>
    </AuthProvider>
  );
}
