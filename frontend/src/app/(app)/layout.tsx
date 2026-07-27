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
      className="flex items-center justify-center gap-2 py-2 px-4 text-xs font-medium"
      style={{
        background: 'linear-gradient(90deg, hsl(246,75%,50%), hsl(286,75%,50%))',
        color: 'white',
      }}
      role="status"
      aria-label="Demo mode active"
    >
      <FlaskConical className="w-3 h-3" aria-hidden="true" />
      Demo Mode — UI preview only. Connect Supabase + Groq to enable live data.
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
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-white text-xl font-bold mx-auto mb-4"
            style={{ background: 'linear-gradient(135deg, var(--color-brand-primary), hsl(286, 75%, 60%))' }}
          >
            C
          </div>
          <div className="spinner w-6 h-6 mx-auto" style={{ color: 'var(--color-brand-primary)' }} />
          <p className="text-sm mt-3" style={{ color: 'var(--text-muted)' }}>Loading CampusFlow...</p>
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
          className="flex-1 min-w-0"
          style={{ paddingLeft: 'var(--sidebar-width)' }}
          id="main-content"
        >
          <div className="p-4 lg:p-8 max-w-7xl mx-auto">
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
