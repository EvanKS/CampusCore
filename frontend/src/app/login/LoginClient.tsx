'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { Eye, EyeOff, GraduationCap, Loader2, BookOpen, Users, ShieldCheck, CheckCircle2, Sparkles, Sun, Moon } from 'lucide-react';
import Link from 'next/link';
import { useTheme } from 'next-themes';

const LoginSchema = z.object({
  email: z.string().email('Invalid email address'),
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
    { label: 'Student', email: 'rahul.verma@demo-university.edu', password: 'Student@123', icon: <GraduationCap className="w-4 h-4 text-purple-600 dark:text-purple-400" /> },
    { label: 'Teacher', email: 'priya.sharma@demo-university.edu', password: 'Teacher@123', icon: <BookOpen className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> },
    { label: 'Parent', email: 'parent@demo-university.edu', password: 'Parent@123', icon: <Users className="w-4 h-4 text-amber-600 dark:text-amber-400" /> },
    { label: 'Admin', email: 'admin@demo-university.edu', password: 'Admin@123', icon: <ShieldCheck className="w-4 h-4 text-cyan-600 dark:text-cyan-400" /> },
  ];

  return (
    <div
      className="min-h-screen flex"
      style={{ background: 'var(--bg-page)' }}
    >
      {/* Left panel — LMS Branding (desktop only) */}
      <div
        className="hidden lg:flex flex-col justify-between w-1/2 p-12 relative overflow-hidden text-white"
        style={{ background: 'linear-gradient(135deg, #4c1d95 0%, #6c5ce7 50%, #312e81 100%)' }}
      >
        {/* Subtle grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-15"
          style={{
            backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.4) 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
          aria-hidden="true"
        />

        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="CampusCore Logo" className="h-12 w-auto object-contain drop-shadow-md" />
            <span className="text-white text-2xl font-black tracking-tight">CampusCore</span>
          </div>
        </div>

        <div className="relative z-10 space-y-6 max-w-lg">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-white/15 text-blue-100 border border-white/25">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" /> The Connected Campus Platform
          </div>
          <h1 className="text-4xl font-black text-white leading-tight tracking-tight">
            Your Complete Campus & Academic Platform.
          </h1>
          <p className="text-blue-100/90 text-sm sm:text-base leading-relaxed font-medium">
            Assignments, attendance analytics, automated notice broadcasting, AI study tools, and multi-channel notifications — built for students, faculty, parents, and administrators.
          </p>

          <div className="grid grid-cols-2 gap-3 pt-2">
            {[
              { text: 'AI Study Buddy' },
              { text: 'Task Management' },
              { text: 'Attendance Alerts' },
              { text: 'Smart Notices' },
            ].map(item => (
              <div key={item.text} className="flex items-center gap-2 text-white text-xs font-bold bg-white/10 p-2.5 rounded-xl border border-white/15">
                <CheckCircle2 className="w-4 h-4 text-cyan-300 shrink-0" />
                <span>{item.text}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-blue-200/70 text-xs font-semibold">
          CampusCore Platform · Powered by Cloud Postgres & Groq AI
        </p>
      </div>

      {/* Right panel — Login form */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-12 relative">
        {/* Theme toggle */}
        <button
          className="absolute top-6 right-6 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm text-slate-700 dark:text-slate-200 hover:border-blue-500 transition-colors"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          aria-label="Toggle theme"
        >
          {mounted ? (theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-blue-600" />) : <div className="w-4 h-4" />}
        </button>

        <div className="w-full max-w-md space-y-6">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-6">
            <img src="/logo.png" alt="CampusCore Logo" className="h-10 w-auto object-contain" />
            <span className="font-black text-xl tracking-tight text-slate-900 dark:text-slate-100">CampusCore</span>
          </div>

          <div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-slate-100">
              Welcome back
            </h2>
            <p className="text-xs sm:text-sm mt-1 text-slate-500 font-medium">
              Sign in to access your CampusCore workspace
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
            {/* Email */}
            <div>
              <label htmlFor="email" className="label">Email Address</label>
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
                <p id="email-error" className="text-xs mt-1 text-red-500 font-medium" role="alert">
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
                  placeholder="Enter your password"
                  {...register('password')}
                  aria-invalid={!!errors.password}
                  aria-describedby={errors.password ? 'password-error' : undefined}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-purple-600 p-1"
                  onClick={() => setShowPassword(p => !p)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && (
                <p id="password-error" className="text-xs mt-1 text-red-500 font-medium" role="alert">
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Error message */}
            {error && (
              <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60" role="alert">
                <p className="text-xs font-semibold text-rose-600 dark:text-rose-300">{error}</p>
              </div>
            )}

            <button
              type="submit"
              className="btn-primary w-full py-3 text-xs font-extrabold shadow-md"
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

          <p className="text-center text-xs font-medium text-slate-500">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="font-extrabold text-purple-600 dark:text-purple-400 hover:underline">
              Register here
            </Link>
          </p>

          {/* Demo login section */}
          <div className="pt-6 border-t border-slate-200 dark:border-slate-800">
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-center text-slate-400 mb-3">
              ⚡ Quick Demo Role Login
            </p>
            <div className="grid grid-cols-2 gap-2.5">
              {demoUsers.map((demo) => (
                <button
                  key={demo.label}
                  type="button"
                  className="btn-secondary py-2.5 px-3 text-xs font-bold gap-2 justify-start hover:border-purple-500 hover:text-purple-600 transition-colors"
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
                  <span>{demo.label}</span>
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

