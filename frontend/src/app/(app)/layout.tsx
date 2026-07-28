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
      className="fixed top-16 left-0 right-0 z-30 flex items-center justify-center gap-2 py-1.5 px-4 text-xs font-bold tracking-wide border-b border-amber-500/20 shadow-sm"
      style={{
        background: 'linear-gradient(90deg, #1e1b4b, #312e81)',
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
  const { isAuthenticated, isLoading, isDemoMode } = useAuth();
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
          <img src="/logo.png" alt="CampusCore Logo" className="h-12 w-auto object-contain mx-auto mb-4 animate-pulse-subtle" />
          <div className="spinner w-6 h-6 mx-auto" style={{ color: 'var(--color-brand-primary)' }} />
          <p className="text-xs font-extrabold mt-3 tracking-widest uppercase" style={{ color: 'var(--text-muted)' }}>
            Loading CampusCore...
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="flex min-h-screen flex-col bg-[var(--bg-page)]">
      <Sidebar />
      <DemoBanner />
      <main
        className={`flex-1 min-w-0 transition-all duration-200 lg:pl-[250px] ${isDemoMode ? 'pt-24' : 'pt-16'}`}
        id="main-content"
      >
        <div className="p-4 sm:p-6 lg:p-7 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
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

