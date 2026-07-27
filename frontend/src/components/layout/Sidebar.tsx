'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import {
  LayoutDashboard, CheckSquare, Users, BookOpen, Bell,
  BarChart3, Settings, LogOut, Sun, Moon, Monitor,
  GraduationCap, ClipboardList, Briefcase, UsersRound,
  Menu, X, Building2, ShieldCheck, UserCheck, HeartHandshake,
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
  { label: 'Dashboard', href: '/dashboard', icon: <LayoutDashboard className="w-4 h-4" />, roles: ['student', 'teacher', 'parent', 'admin'] },
  { label: 'Tasks & Deadlines', href: '/tasks', icon: <CheckSquare className="w-4 h-4" />, roles: ['student'] },
  { label: 'Attendance', href: '/attendance', icon: <ClipboardList className="w-4 h-4" />, roles: ['student', 'teacher', 'parent'] },
  { label: 'Notices', href: '/notices', icon: <Bell className="w-4 h-4" />, roles: ['student', 'teacher', 'parent', 'admin'] },
  { label: 'AI Study Buddy', href: '/study-buddy', icon: <BookOpen className="w-4 h-4" />, roles: ['student'] },
  { label: 'Study Groups', href: '/study-groups', icon: <UsersRound className="w-4 h-4" />, roles: ['student'] },
  { label: 'Placement Tracker', href: '/placement', icon: <Briefcase className="w-4 h-4" />, roles: ['student'] },
  { label: 'Students Roster', href: '/students', icon: <GraduationCap className="w-4 h-4" />, roles: ['teacher'] },
  { label: 'Notifications', href: '/notifications', icon: <Bell className="w-4 h-4" />, roles: ['student', 'teacher', 'parent', 'admin'] },
  { label: 'Analytics', href: '/admin/analytics', icon: <BarChart3 className="w-4 h-4" />, roles: ['admin'] },
  { label: 'User Directory', href: '/admin/users', icon: <Users className="w-4 h-4" />, roles: ['admin'] },
  { label: 'Course Subjects', href: '/admin/subjects', icon: <BookOpen className="w-4 h-4" />, roles: ['admin'] },
  { label: 'Institution Setup', href: '/admin/institution', icon: <Building2 className="w-4 h-4" />, roles: ['admin'] },
  { label: 'Settings', href: '/settings', icon: <Settings className="w-4 h-4" />, roles: ['student', 'teacher', 'parent', 'admin'] },
];

export function Sidebar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (!user) return null;

  const filtered = navItems.filter(item => item.roles.includes(user.role));

  const roleIcons: Record<string, React.ReactNode> = {
    student: <GraduationCap className="w-3.5 h-3.5" />,
    teacher: <UserCheck className="w-3.5 h-3.5" />,
    parent: <HeartHandshake className="w-3.5 h-3.5" />,
    admin: <ShieldCheck className="w-3.5 h-3.5" />,
  };

  const themeOptions = [
    { value: 'light', icon: <Sun className="w-3.5 h-3.5" />, label: 'Light' },
    { value: 'dark', icon: <Moon className="w-3.5 h-3.5" />, label: 'Dark' },
    { value: 'system', icon: <Monitor className="w-3.5 h-3.5" />, label: 'Auto' },
  ];

  const SidebarContent = () => (
    <aside
      className="flex flex-col h-full select-none"
      style={{ background: 'var(--bg-sidebar)', color: 'white' }}
      aria-label="Navigation sidebar"
    >
      {/* Brand Header */}
      <div className="flex items-center justify-between px-5 py-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-base font-extrabold shadow-md bg-gradient-to-br from-blue-500 to-indigo-700 border border-white/20">
            C
          </div>
          <div>
            <p className="font-extrabold text-base tracking-tight text-white">CampusFlow</p>
            <p className="text-[11px] font-medium text-blue-200/70 capitalize">
              Academic Platform
            </p>
          </div>
        </div>
      </div>

      {/* User Profile Card */}
      <div className="px-4 py-4 border-b border-white/10 bg-white/[0.03]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-600 to-teal-400 text-white font-bold text-sm flex items-center justify-center shrink-0 shadow-inner">
            {user.full_name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-white truncate">
              {user.full_name}
            </p>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white/10 text-blue-200 capitalize">
                {roleIcons[user.role]}
                {user.role}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1" role="navigation" aria-label="Main navigation">
        {filtered.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href + '/'));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-item ${isActive ? 'active' : ''}`}
              onClick={() => setMobileOpen(false)}
              aria-current={isActive ? 'page' : undefined}
            >
              <span aria-hidden="true" className={isActive ? 'text-white' : 'text-blue-200/70'}>
                {item.icon}
              </span>
              <span className="text-xs tracking-wide">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Theme Switcher */}
      <div className="px-4 py-3 border-t border-white/10 bg-white/[0.02]">
        <p className="text-[10px] font-bold uppercase tracking-wider text-blue-200/60 mb-2 px-1">Theme</p>
        <div className="flex gap-1 p-1 bg-black/20 rounded-lg">
          {themeOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setTheme(opt.value)}
              className={`flex-1 py-1.5 text-[11px] font-medium rounded-md flex items-center justify-center gap-1 transition-all ${
                theme === opt.value
                  ? 'bg-blue-600 text-white shadow-sm font-semibold'
                  : 'text-blue-200/70 hover:text-white hover:bg-white/5'
              }`}
              aria-label={`${opt.label} theme`}
              aria-pressed={theme === opt.value}
            >
              {opt.icon}
              <span>{opt.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Sign Out Button */}
      <div className="px-3 py-3 border-t border-white/10">
        <button
          onClick={logout}
          className="flex items-center gap-3 w-full px-3.5 py-2.5 rounded-xl text-xs font-semibold text-rose-300 hover:text-white hover:bg-rose-500/20 transition-all duration-150"
          aria-label="Sign out"
        >
          <LogOut className="w-4 h-4 text-rose-400" aria-hidden="true" />
          Sign Out
        </button>
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <div
        className="hidden lg:flex flex-col fixed left-0 top-0 h-screen z-30 border-r border-slate-800"
        style={{ width: 'var(--sidebar-width)' }}
      >
        <SidebarContent />
      </div>

      {/* Mobile Hamburger Button */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 btn-secondary p-2.5 shadow-lg bg-slate-900 text-white border-slate-700"
        onClick={() => setMobileOpen(true)}
        aria-label="Open navigation menu"
        aria-expanded={mobileOpen}
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-sm animate-fade-in"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile Drawer */}
      <div
        className={`lg:hidden fixed left-0 top-0 h-screen z-50 border-r border-slate-800 flex flex-col transition-transform duration-300 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ width: 'min(var(--sidebar-width), 80vw)' }}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
      >
        <button
          className="absolute top-4 right-4 text-blue-200/80 hover:text-white p-1.5"
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
