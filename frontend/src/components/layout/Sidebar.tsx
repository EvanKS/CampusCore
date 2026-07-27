'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import {
  LayoutDashboard, CheckSquare, Users, BookOpen, Bell,
  BarChart3, Settings, LogOut, Sun, Moon, Monitor,
  GraduationCap, ClipboardList, Briefcase, UsersRound,
  Menu, X, Building2,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useState } from 'react';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  roles: Array<'student' | 'teacher' | 'parent' | 'admin'>;
}

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: <LayoutDashboard className="w-5 h-5" />, roles: ['student', 'teacher', 'parent', 'admin'] },
  { label: 'Tasks', href: '/tasks', icon: <CheckSquare className="w-5 h-5" />, roles: ['student'] },
  { label: 'Attendance', href: '/attendance', icon: <ClipboardList className="w-5 h-5" />, roles: ['student', 'teacher', 'parent'] },
  { label: 'Notices', href: '/notices', icon: <Bell className="w-5 h-5" />, roles: ['student', 'teacher', 'parent', 'admin'] },
  { label: 'Study Buddy', href: '/study-buddy', icon: <BookOpen className="w-5 h-5" />, roles: ['student'] },
  { label: 'Study Groups', href: '/study-groups', icon: <UsersRound className="w-5 h-5" />, roles: ['student'] },
  { label: 'Placement', href: '/placement', icon: <Briefcase className="w-5 h-5" />, roles: ['student'] },
  { label: 'Students', href: '/students', icon: <GraduationCap className="w-5 h-5" />, roles: ['teacher'] },
  { label: 'Notifications', href: '/notifications', icon: <Bell className="w-5 h-5" />, roles: ['student', 'teacher', 'parent', 'admin'] },
  { label: 'Analytics', href: '/admin/analytics', icon: <BarChart3 className="w-5 h-5" />, roles: ['admin'] },
  { label: 'Users', href: '/admin/users', icon: <Users className="w-5 h-5" />, roles: ['admin'] },
  { label: 'Subjects', href: '/admin/subjects', icon: <BookOpen className="w-5 h-5" />, roles: ['admin'] },
  { label: 'Institution', href: '/admin/institution', icon: <Building2 className="w-5 h-5" />, roles: ['admin'] },
  { label: 'Settings', href: '/settings', icon: <Settings className="w-5 h-5" />, roles: ['student', 'teacher', 'parent', 'admin'] },
];

export function Sidebar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (!user) return null;

  const filtered = navItems.filter(item => item.roles.includes(user.role));
  const roleColors: Record<string, string> = {
    student: 'badge-brand',
    teacher: 'badge-success',
    parent: 'badge-info',
    admin: 'badge-warning',
  };

  const themeOptions = [
    { value: 'light', icon: <Sun className="w-4 h-4" />, label: 'Light' },
    { value: 'dark', icon: <Moon className="w-4 h-4" />, label: 'Dark' },
    { value: 'system', icon: <Monitor className="w-4 h-4" />, label: 'System' },
  ];

  const SidebarContent = () => (
    <aside
      className="flex flex-col h-full"
      style={{ background: 'var(--bg-sidebar)' }}
      aria-label="Navigation sidebar"
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b" style={{ borderColor: 'var(--border-default)' }}>
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-lg font-bold shadow-md"
          style={{ background: 'linear-gradient(135deg, var(--color-brand-primary), hsl(286, 75%, 60%))' }}
          aria-hidden="true"
        >
          C
        </div>
        <div>
          <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>CampusFlow</p>
          <p className="text-xs capitalize" style={{ color: 'var(--text-muted)' }}>
            {user.role} Portal
          </p>
        </div>
      </div>

      {/* User info */}
      <div className="px-4 py-4 border-b" style={{ borderColor: 'var(--border-default)' }}>
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-white font-semibold text-sm shrink-0"
            style={{ background: 'linear-gradient(135deg, var(--color-brand-primary), hsl(286, 75%, 60%))' }}
            aria-hidden="true"
          >
            {user.full_name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
              {user.full_name}
            </p>
            <span className={`badge ${roleColors[user.role] || 'badge-brand'} capitalize`}>
              {user.role}
            </span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5" role="navigation" aria-label="Main navigation">
        {filtered.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-item ${isActive ? 'active' : ''}`}
              onClick={() => setMobileOpen(false)}
              aria-current={isActive ? 'page' : undefined}
            >
              <span aria-hidden="true">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Theme switcher */}
      <div className="px-3 py-3 border-t" style={{ borderColor: 'var(--border-default)' }}>
        <p className="text-xs font-medium px-3 mb-2" style={{ color: 'var(--text-muted)' }}>Theme</p>
        <div className="flex gap-1">
          {themeOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setTheme(opt.value)}
              className={`btn flex-1 py-1.5 text-xs gap-1 ${
                theme === opt.value ? 'btn-primary' : 'btn-secondary'
              }`}
              aria-label={`${opt.label} theme`}
              aria-pressed={theme === opt.value}
            >
              {opt.icon}
              <span className="hidden sm:inline">{opt.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Logout */}
      <div className="px-3 pb-4">
        <button
          onClick={logout}
          className="nav-item w-full text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10"
          aria-label="Sign out"
        >
          <LogOut className="w-5 h-5" aria-hidden="true" />
          Sign Out
        </button>
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <div
        className="hidden lg:flex flex-col fixed left-0 top-0 h-screen z-30 border-r"
        style={{
          width: 'var(--sidebar-width)',
          borderColor: 'var(--border-default)',
        }}
      >
        <SidebarContent />
      </div>

      {/* Mobile hamburger */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 btn-secondary p-2.5 shadow-md"
        onClick={() => setMobileOpen(true)}
        aria-label="Open navigation menu"
        aria-expanded={mobileOpen}
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Mobile drawer overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm animate-fade-in"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile drawer */}
      <div
        className={`lg:hidden fixed left-0 top-0 h-screen z-50 border-r flex flex-col transition-transform duration-300 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{
          width: 'min(var(--sidebar-width), 80vw)',
          borderColor: 'var(--border-default)',
        }}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
      >
        <button
          className="absolute top-4 right-4 btn-ghost p-1.5"
          onClick={() => setMobileOpen(false)}
          aria-label="Close navigation menu"
        >
          <X className="w-5 h-5" />
        </button>
        <SidebarContent />
      </div>
    </>
  );
}
