'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import { Sun, Moon } from 'lucide-react';

const RegisterSchema = z.object({
  fullName: z.string().min(2, 'Full name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['student', 'teacher', 'parent', 'admin']).refine((v) => v !== undefined, {
    message: 'Please select your role',
  }),
  institutionSlug: z.string().min(1, 'Institution slug is required'),
  phone: z.string().optional(),
});

type RegisterForm = z.infer<typeof RegisterSchema>;

function RegisterFormComponent() {
  const { register: registerUser } = useAuth();
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const { theme, setTheme } = useTheme();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>({ resolver: zodResolver(RegisterSchema) });

  async function onSubmit(data: RegisterForm) {
    setError('');
    try {
      await registerUser(data);
      router.push('/dashboard');
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error ?? 'Registration failed. Please try again.';
      setError(msg);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'var(--bg-page)' }}>
      {/* Theme toggle */}
      <button
        className="fixed top-6 right-6 btn-secondary p-2.5 shadow-sm"
        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
      >
        {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
      </button>

      <div className="w-full max-w-md space-y-6">
        {/* Logo Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-800 flex items-center justify-center text-white font-extrabold text-xl shadow-md border border-white/20">
            C
          </div>
          <span className="font-extrabold text-2xl tracking-tight" style={{ color: 'var(--text-primary)' }}>CampusFlow</span>
        </div>

        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            Create your account
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            Join your campus institution on CampusFlow
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          {/* Full Name */}
          <div>
            <label htmlFor="reg-name" className="label">Full Name *</label>
            <input
              id="reg-name"
              type="text"
              autoComplete="name"
              className="input"
              placeholder="Your full name"
              {...register('fullName')}
              aria-invalid={!!errors.fullName}
            />
            {errors.fullName && (
              <p className="text-xs mt-1 text-red-500 font-medium" role="alert">{errors.fullName.message}</p>
            )}
          </div>

          {/* Email */}
          <div>
            <label htmlFor="reg-email" className="label">Email Address *</label>
            <input
              id="reg-email"
              type="email"
              autoComplete="email"
              className="input"
              placeholder="you@university.edu"
              {...register('email')}
              aria-invalid={!!errors.email}
            />
            {errors.email && (
              <p className="text-xs mt-1 text-red-500 font-medium" role="alert">{errors.email.message}</p>
            )}
          </div>

          {/* Password */}
          <div>
            <label htmlFor="reg-password" className="label">Password *</label>
            <div className="relative">
              <input
                id="reg-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                className="input pr-10"
                placeholder="Min. 8 characters"
                {...register('password')}
                aria-invalid={!!errors.password}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                onClick={() => setShowPassword((p) => !p)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.password && (
              <p className="text-xs mt-1 text-red-500 font-medium" role="alert">{errors.password.message}</p>
            )}
          </div>

          {/* Role */}
          <div>
            <label htmlFor="reg-role" className="label">Role *</label>
            <select
              id="reg-role"
              className="input font-medium"
              {...register('role')}
              aria-invalid={!!errors.role}
            >
              <option value="">Select your role...</option>
              <option value="student">Student</option>
              <option value="teacher">Teacher</option>
              <option value="parent">Parent</option>
              <option value="admin">Admin</option>
            </select>
            {errors.role && (
              <p className="text-xs mt-1 text-red-500 font-medium" role="alert">{errors.role.message}</p>
            )}
          </div>

          {/* Institution Slug */}
          <div>
            <label htmlFor="reg-slug" className="label">Institution Slug *</label>
            <input
              id="reg-slug"
              type="text"
              className="input"
              placeholder="e.g. demo-university"
              {...register('institutionSlug')}
              aria-invalid={!!errors.institutionSlug}
            />
            <p className="text-xs mt-1 font-medium" style={{ color: 'var(--text-muted)' }}>
              For demo: use <strong className="text-blue-600 dark:text-blue-400">demo-university</strong>
            </p>
            {errors.institutionSlug && (
              <p className="text-xs mt-1 text-red-500 font-medium" role="alert">{errors.institutionSlug.message}</p>
            )}
          </div>

          {/* Phone (optional) */}
          <div>
            <label htmlFor="reg-phone" className="label">
              Phone <span style={{ color: 'var(--text-muted)' }}>(optional — for WhatsApp reminders)</span>
            </label>
            <input
              id="reg-phone"
              type="tel"
              autoComplete="tel"
              className="input"
              placeholder="+91 98765 43210"
              {...register('phone')}
            />
          </div>

          {/* Error */}
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
                Creating account...
              </>
            ) : (
              'Create Account'
            )}
          </button>
        </form>

        <p className="text-center text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
          Already have an account?{' '}
          <Link href="/login" className="font-bold text-blue-600 dark:text-blue-400 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function RegisterClient() {
  return (
    <AuthProvider>
      <RegisterFormComponent />
    </AuthProvider>
  );
}
