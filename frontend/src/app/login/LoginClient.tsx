'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { Eye, EyeOff, GraduationCap, Loader2, BookOpen, Users, Shield } from 'lucide-react';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import { Sun, Moon } from 'lucide-react';

const LoginSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password is required'),
});

type LoginForm = z.infer<typeof LoginSchema>;

function LoginForm() {
  const { login } = useAuth();
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({ resolver: zodResolver(LoginSchema) });

  async function onSubmit(data: LoginForm) {
    setError('');
    try {
      await login(data.email, data.password);
      router.push('/dashboard');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })
        ?.response?.data?.error ?? 'Invalid email or password';
      setError(msg);
    }
  }

  // Demo quick-login helpers
  const demoUsers = [
    { label: 'Student', email: 'rahul.verma@demo-university.edu', password: 'Student@123', icon: <GraduationCap className="w-4 h-4" /> },
    { label: 'Teacher', email: 'priya.sharma@demo-university.edu', password: 'Teacher@123', icon: <BookOpen className="w-4 h-4" /> },
    { label: 'Parent', email: 'parent@demo-university.edu', password: 'Parent@123', icon: <Users className="w-4 h-4" /> },
    { label: 'Admin', email: 'admin@demo-university.edu', password: 'Admin@123', icon: <Shield className="w-4 h-4" /> },
  ];

  return (
    <div
      className="min-h-screen flex"
      style={{ background: 'var(--bg-page)' }}
    >
      {/* Left panel — branding (desktop only) */}
      <div
        className="hidden lg:flex flex-col justify-between w-1/2 p-12 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, hsl(246, 75%, 40%) 0%, hsl(286, 75%, 45%) 50%, hsl(320, 70%, 45%) 100%)' }}
      >
        {/* Grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
            backgroundSize: '30px 30px',
          }}
          aria-hidden="true"
        />

        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white text-lg font-bold">
              C
            </div>
            <span className="text-white text-xl font-bold">CampusFlow</span>
          </div>
        </div>

        <div className="relative z-10 space-y-6">
          <h1 className="text-4xl font-bold text-white leading-tight">
            Your Campus,<br />Simplified.
          </h1>
          <p className="text-white/80 text-lg leading-relaxed">
            Tasks, attendance, notices, AI study buddy, and more — all in one place for students, teachers, parents, and administrators.
          </p>

          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: '📚', text: 'AI Study Buddy' },
              { icon: '✅', text: 'Task Management' },
              { icon: '📊', text: 'Attendance Tracking' },
              { icon: '📢', text: 'Smart Notices' },
            ].map(item => (
              <div key={item.text} className="flex items-center gap-2 text-white/80 text-sm">
                <span>{item.icon}</span>
                <span>{item.text}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-white/50 text-xs">
          Free to use · Built on free-tier cloud services · No credit card required
        </p>
      </div>

      {/* Right panel — login form */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-12 relative">
        {/* Theme toggle */}
        <button
          className="absolute top-4 right-4 btn-secondary p-2"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          aria-label="Toggle theme"
        >
          {mounted ? (theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />) : <div className="w-4 h-4" />}
        </button>

        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold"
              style={{ background: 'linear-gradient(135deg, var(--color-brand-primary), hsl(286, 75%, 60%))' }}
            >
              C
            </div>
            <span className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>CampusFlow</span>
          </div>

          <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
            Welcome back
          </h2>
          <p className="text-sm mb-8" style={{ color: 'var(--text-secondary)' }}>
            Sign in to your CampusFlow account
          </p>

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
            {/* Email */}
            <div>
              <label htmlFor="email" className="label">Email address</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                className="input"
                placeholder="you@university.edu"
                {...register('email')}
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? 'email-error' : undefined}
              />
              {errors.email && (
                <p id="email-error" className="text-xs mt-1 text-red-500" role="alert">
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="label">Password</label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  className="input pr-10"
                  placeholder="Your password"
                  {...register('password')}
                  aria-invalid={!!errors.password}
                  aria-describedby={errors.password ? 'password-error' : undefined}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 btn-ghost p-0"
                  onClick={() => setShowPassword(p => !p)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword
                    ? <EyeOff className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                    : <Eye className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                  }
                </button>
              </div>
              {errors.password && (
                <p id="password-error" className="text-xs mt-1 text-red-500" role="alert">
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Error message */}
            {error && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800" role="alert">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            <button
              type="submit"
              className="btn-primary w-full py-2.5"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Signing in...
                </>
              ) : 'Sign In'}
            </button>
          </form>

          <p className="text-center text-sm mt-6" style={{ color: 'var(--text-secondary)' }}>
            Don&apos;t have an account?{' '}
            <Link href="/register" className="font-medium" style={{ color: 'var(--text-brand)' }}>
              Register here
            </Link>
          </p>

          {/* Demo login section */}
          <div className="mt-8 pt-6 border-t" style={{ borderColor: 'var(--border-default)' }}>
            <p className="text-xs font-medium text-center mb-3" style={{ color: 'var(--text-muted)' }}>
              🚀 Quick demo access
            </p>
            <div className="grid grid-cols-2 gap-2">
              {demoUsers.map((demo) => (
                <button
                  key={demo.label}
                  type="button"
                  className="btn-secondary py-2 text-xs gap-1.5"
                  onClick={async () => {
                    setError('');
                    try {
                      await login(demo.email, demo.password);
                      router.push('/dashboard');
                    } catch {
                      setError('Demo login failed. Run the seed script first.');
                    }
                  }}
                  aria-label={`Sign in as ${demo.label}`}
                >
                  {demo.icon}
                  {demo.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginClient() {
  return (
    <AuthProvider>
      <LoginForm />
    </AuthProvider>
  );
}
