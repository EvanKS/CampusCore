'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import {
  LayoutDashboard, CheckSquare, Users, BookOpen, Bell,
  BarChart3, Settings, LogOut, Sun, Moon, Monitor,
  GraduationCap, ClipboardList, Briefcase, UsersRound,
  Menu, X, Building2, ShieldCheck, UserCheck, HeartHandshake,
  Search, Eye
} from 'lucide-react';

import { useAuth } from '@/contexts/AuthContext';
import { useState } from 'react';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  roles: Array<'student' | 'teacher' | 'parent' | 'admin'>;
  category: 'Dashboards' | 'Academics' | 'Tools & AI' | 'Management' | 'Account';
}

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: <LayoutDashboard className="w-4 h-4" />, roles: ['student', 'teacher', 'parent', 'admin'], category: 'Dashboards' },
  { label: 'Tasks & Deadlines', href: '/tasks', icon: <CheckSquare className="w-4 h-4" />, roles: ['student'], category: 'Academics' },
  { label: 'Attendance', href: '/attendance', icon: <ClipboardList className="w-4 h-4" />, roles: ['student', 'teacher', 'parent'], category: 'Academics' },
  { label: 'Students Roster', href: '/students', icon: <GraduationCap className="w-4 h-4" />, roles: ['teacher'], category: 'Academics' },
  
  { label: 'AI Study Buddy', href: '/study-buddy', icon: <BookOpen className="w-4 h-4" />, roles: ['student'], category: 'Tools & AI' },
  { label: 'Study Groups', href: '/study-groups', icon: <UsersRound className="w-4 h-4" />, roles: ['student'], category: 'Tools & AI' },
  { label: 'Placement Tracker', href: '/placement', icon: <Briefcase className="w-4 h-4" />, roles: ['student'], category: 'Tools & AI' },

  { label: 'Analytics Overview', href: '/admin/analytics', icon: <BarChart3 className="w-4 h-4" />, roles: ['admin'], category: 'Management' },
  { label: 'User Directory', href: '/admin/users', icon: <Users className="w-4 h-4" />, roles: ['admin'], category: 'Management' },
  { label: 'Course Subjects', href: '/admin/subjects', icon: <BookOpen className="w-4 h-4" />, roles: ['admin'], category: 'Management' },
  { label: 'Institution Setup', href: '/admin/institution', icon: <Building2 className="w-4 h-4" />, roles: ['admin'], category: 'Management' },

  { label: 'Campus Notices', href: '/notices', icon: <Bell className="w-4 h-4" />, roles: ['student', 'teacher', 'parent', 'admin'], category: 'Account' },
  { label: 'Notifications', href: '/notifications', icon: <Bell className="w-4 h-4" />, roles: ['student', 'teacher', 'parent', 'admin'], category: 'Account' },
  { label: 'Account Settings', href: '/settings', icon: <Settings className="w-4 h-4" />, roles: ['student', 'teacher', 'parent', 'admin'], category: 'Account' },
];

export function Sidebar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  if (!user) return null;

  const filtered = navItems.filter(item => item.roles.includes(user.role));

  const categories = Array.from(new Set(filtered.map(i => i.category)));

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

  return (
    <>
      {/* ============================================================
         TOP NAVBAR — Bright Purple / Violet Brand Banner
         ============================================================ */}
      <header className="fixed top-0 left-0 right-0 z-40 h-16 bg-gradient-to-r from-purple-700 via-violet-700 to-indigo-700 text-white shadow-md flex items-center justify-between px-4 lg:px-6">
        <div className="flex items-center gap-3">
          {/* Mobile menu toggle */}
          <button
            className="lg:hidden p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle navigation menu"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          {/* Logo & Platform Title */}
          <Link href="/dashboard" className="flex items-center gap-2.5 group">
            <img
              src="/logo.png"
              alt="CampusCore Logo"
              className="h-9 w-auto object-contain rounded-lg bg-white/10 p-0.5 border border-white/20 group-hover:scale-105 transition-transform"
            />
            <div>
              <span className="font-black text-lg tracking-tight text-white flex items-center gap-1.5">
                CampusCore
              </span>
            </div>
          </Link>
        </div>

        {/* Global Search Bar */}
        <div className="hidden md:flex items-center flex-1 max-w-xs mx-8">
          <div className="relative w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-purple-200" />
            <input
              type="text"
              placeholder="Search courses, tasks, notices..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-white/15 border border-white/25 focus:border-white focus:bg-white/25 rounded-full py-1.5 pl-9 pr-4 text-xs text-white placeholder-purple-200 outline-none transition-all"
            />
          </div>
        </div>

        {/* Right Header Controls */}
        <div className="flex items-center gap-2.5">
          {/* Live Demo badge */}
          <div className="hidden xl:flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-400/20 text-sky-100 text-[11px] font-bold border border-sky-300/30">
            <Eye className="w-3.5 h-3.5 text-sky-300" /> Live LMS
          </div>

          {/* Notification bell badge */}
          <Link
            href="/notifications"
            className="relative p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white font-extrabold text-[9px] rounded-full flex items-center justify-center border-2 border-purple-700">
              3
            </span>
          </Link>

          {/* User Profile Pill */}
          <div className="flex items-center gap-2.5 pl-2 border-l border-white/20">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-400 to-pink-500 text-white font-black text-xs flex items-center justify-center shrink-0 border border-white/40 shadow-sm">
              {user.full_name.charAt(0).toUpperCase()}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-xs font-bold leading-tight truncate text-white">{user.full_name}</p>
              <p className="text-[10px] font-semibold text-purple-200 capitalize flex items-center gap-1">
                {roleIcons[user.role]} {user.role}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* ============================================================
         LEFT SIDEBAR — White Background with Purple Active States
         ============================================================ */}
      <aside
        className="hidden lg:flex flex-col fixed left-0 top-16 h-[calc(100vh-64px)] z-30 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-all select-none"
        style={{ width: 'var(--sidebar-width)' }}
        aria-label="Navigation sidebar"
      >
        {/* Navigation Groups */}
        <nav className="flex-1 overflow-y-auto px-3.5 py-5 space-y-5" role="navigation">
          {categories.map((cat) => {
            const catItems = filtered.filter(i => i.category === cat);
            if (catItems.length === 0) return null;

            return (
              <div key={cat} className="space-y-1">
                <p className="px-3 text-[10px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2">
                  {cat}
                </p>
                {catItems.map((item) => {
                  const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href + '/'));
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`nav-item ${isActive ? 'active' : ''}`}
                      aria-current={isActive ? 'page' : undefined}
                    >
                      <span aria-hidden="true" className={isActive ? 'text-white' : 'text-purple-600 dark:text-purple-400'}>
                        {item.icon}
                      </span>
                      <span className="text-xs font-bold tracking-tight">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </nav>

        {/* Theme Switcher Controls */}
        <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2 px-1">
            Appearance
          </p>
          <div className="flex gap-1 p-1 bg-slate-200/60 dark:bg-slate-800 rounded-xl">
            {themeOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setTheme(opt.value)}
                className={`flex-1 py-1 text-[10px] font-bold rounded-lg flex items-center justify-center gap-1 transition-all ${
                  theme === opt.value
                    ? 'bg-purple-600 text-white shadow-sm font-black'
                    : 'text-slate-600 dark:text-slate-400 hover:text-purple-700'
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

        {/* Footer Sign Out */}
        <div className="p-3 border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={logout}
            className="flex items-center gap-2.5 w-full px-3.5 py-2.5 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-all duration-150"
            aria-label="Sign out"
          >
            <LogOut className="w-4 h-4 text-rose-500" aria-hidden="true" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile Sidebar Overlay & Drawer */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm animate-fade-in"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      <div
        className={`lg:hidden fixed left-0 top-16 bottom-0 z-50 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col transition-transform duration-300 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ width: 'min(var(--sidebar-width), 85vw)' }}
        role="dialog"
        aria-modal="true"
        aria-label="Mobile Navigation"
      >
        <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4">
          {categories.map((cat) => {
            const catItems = filtered.filter(i => i.category === cat);
            if (catItems.length === 0) return null;

            return (
              <div key={cat} className="space-y-1">
                <p className="px-3 text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-1.5">
                  {cat}
                </p>
                {catItems.map((item) => {
                  const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href + '/'));
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`nav-item ${isActive ? 'active' : ''}`}
                      onClick={() => setMobileOpen(false)}
                    >
                      <span aria-hidden="true" className={isActive ? 'text-white' : 'text-purple-600'}>
                        {item.icon}
                      </span>
                      <span className="text-xs font-bold">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </div>

        <div className="p-4 border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={logout}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50"
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </div>
    </>
  );
}

