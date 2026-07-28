'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { Eye, EyeOff, Loader2, Sparkles, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import { Sun, Moon } from 'lucide-react';

const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

const demoUsers = [
  { label: 'Student', email: 'rahul.verma@demo-university.edu', password: 'Student@123', icon: '🎓' },
  { label: 'Teacher', email: 'priya.sharma@demo-university.edu', password: 'Teacher@123', icon: '📖' },
  { label: 'Parent', email: 'parent@demo-university.edu', password: 'Parent@123', icon: '👨‍👩‍👧' },
  { label: 'Admin', email: 'oreo@gmail.com', password: 'oreo12345', icon: '🛡️' },
];

function LoginForm() {
  const { login, user } = useAuth();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Redirect if user is logged in
  useEffect(() => {
    if (user) {
      router.push('/dashboard');
    }
  }, [user, router]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: 'oreo@gmail.com',
      password: 'oreo12345',
    },
  });

  const onSubmit = async (values: LoginFormValues) => {
    setError('');
    try {
      await login(values.email, values.password);
      router.push('/dashboard');
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message || 'Invalid email or password.';
      setError(msg);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-slate-50 dark:bg-slate-950 font-sans transition-colors duration-300">
      {/* Left panel — Hero Academic Branding */}
      <div className="lg:flex-1 bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 p-8 lg:p-16 flex flex-col justify-between relative overflow-hidden">
        {/* Subtle background grid pattern */}
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
            <div className="bg-white p-2 rounded-xl shadow-md border border-white/30 inline-flex items-center justify-center">
              <img src="/logo.png" alt="CampusCore Logo" className="h-8 w-auto object-contain" />
            </div>
            <span className="text-white text-2xl font-black tracking-tight">CampusCore</span>
          </div>
        </div>

        <div className="relative z-10 space-y-6 max-w-lg my-8 lg:my-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-200 border border-blue-400/20">
            <Sparkles className="w-3.5 h-3.5 text-blue-300" /> Multi-Tenant Campus Platform
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white leading-tight tracking-tight">
            Your Campus Management Platform,<br />Simplified.
          </h1>
          <p className="text-blue-100/80 text-sm sm:text-base leading-relaxed">
            Tasks, attendance tracking, instant notices, AI study tools, and multi-channel notifications — built for students, faculty, parents, and administrators.
          </p>

          <div className="grid grid-cols-2 gap-3 pt-2">
            {[
              { text: 'AI Study Buddy' },
              { text: 'Task Management' },
              { text: 'Attendance Alerts' },
              { text: 'Smart Notices' },
            ].map(item => (
              <div key={item.text} className="flex items-center gap-2 text-blue-100/90 text-sm font-medium">
                <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
                <span>{item.text}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-blue-200/50 text-xs font-medium">
          CampusCore Platform · Powered by Supabase & Groq AI
        </p>
      </div>

      {/* Right panel — login form */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-12 relative">
        {/* Theme toggle */}
        <button
          className="absolute top-6 right-6 btn-secondary p-2.5 rounded-xl shadow-sm"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          aria-label="Toggle theme"
        >
          {mounted ? (theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />) : <div className="w-4 h-4" />}
        </button>

        <div className="w-full max-w-md space-y-6">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-6">
            <div className="bg-white p-2 rounded-xl shadow-md border border-slate-200 inline-flex items-center justify-center">
              <img src="/logo.png" alt="CampusCore Logo" className="h-8 w-auto object-contain" />
            </div>
            <span className="font-extrabold text-xl tracking-tight text-slate-900 dark:text-slate-100">CampusCore</span>
          </div>

          <div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
              Welcome back
            </h2>
            <p className="text-sm mt-1 text-slate-500 dark:text-slate-400">
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
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
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
              className="btn-primary w-full py-3 text-sm font-bold shadow-md"
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

          <p className="text-center text-sm font-medium text-slate-500 dark:text-slate-400">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="font-bold text-blue-600 dark:text-blue-400 hover:underline">
              Register here
            </Link>
          </p>

          {/* Demo login section */}
          <div className="pt-6 border-t border-slate-200 dark:border-slate-800">
            <p className="text-xs font-bold uppercase tracking-wider text-center mb-3 text-slate-400">
              ⚡ Quick Demo Login
            </p>
            <div className="grid grid-cols-2 gap-2.5">
              {demoUsers.map((demo) => (
                <button
                  key={demo.label}
                  type="button"
                  className="btn-secondary py-2.5 px-3 text-xs font-semibold gap-2 justify-start hover:border-blue-500"
                  onClick={async () => {
                    setError('');
                    try {
                      await login(demo.email, demo.password);
                      router.push('/dashboard');
                    } catch {
                      setError('Demo login failed. Check backend connection.');
                    }
                  }}
                  aria-label={`Sign in as ${demo.label}`}
                >
                  <span>{demo.icon}</span>
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
