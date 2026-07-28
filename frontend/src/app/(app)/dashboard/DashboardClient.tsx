'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import {
  CheckSquare, ClipboardList, Bell, TrendingUp,
  BookOpen, Briefcase, Users, Sparkles,
  ArrowRight, Clock, ShieldCheck, GraduationCap,
  Award, UserCheck, ChevronRight
} from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { PageHeader } from '@/components/layout/PageHeader';
import { LmsKpiCard } from '@/components/ui/LmsKpiCard';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip
} from 'recharts';


// Demo chart data for Admin visual dashboard
const chartData = [
  { month: 'Jan', enrollment: 65, attendance: 88, completed: 42 },
  { month: 'Feb', enrollment: 78, attendance: 90, completed: 55 },
  { month: 'Mar', enrollment: 85, attendance: 84, completed: 68 },
  { month: 'Apr', enrollment: 72, attendance: 92, completed: 60 },
  { month: 'May', enrollment: 90, attendance: 95, completed: 78 },
  { month: 'Jun', enrollment: 82, attendance: 89, completed: 70 },
  { month: 'Jul', enrollment: 96, attendance: 94, completed: 85 },
];

function StudentDashboard() {
  const { user } = useAuth();

  const { data: tasks } = useQuery({
    queryKey: ['tasks', 'recent'],
    queryFn: () => api.get('/tasks?limit=5').then(r => r.data),
  });

  const { data: attendance } = useQuery({
    queryKey: ['attendance', 'summary'],
    queryFn: () => api.get('/attendance/summary').then(r => r.data),
  });

  const { data: notifications } = useQuery({
    queryKey: ['notifications', 'unread'],
    queryFn: () => api.get('/notifications?unreadOnly=true&limit=5').then(r => r.data),
  });

  const pendingTasks = tasks?.data?.filter((t: { status: string }) => t.status !== 'completed') ?? [];
  const urgentTasks = pendingTasks.filter((t: { priority: string }) => t.priority === 'urgent' || t.priority === 'high');
  const avgAttendance = attendance?.data?.length
    ? Math.round(attendance.data.reduce((sum: number, s: { percentage: number }) => sum + Number(s.percentage), 0) / attendance.data.length)
    : 88;
  const lowAttendance = attendance?.data?.filter((s: { percentage: number }) => Number(s.percentage) < 75) ?? [];

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Student Dashboard"
        category="Home"
        breadcrumb="Student Dashboard"
      />

      {/* Welcome Banner inspired by reference screenshot */}
      <div className="bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-700 text-white rounded-3xl p-6 sm:p-7 shadow-xl relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-60 h-60 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white/20 border-2 border-white/40 flex items-center justify-center text-white text-2xl font-black shrink-0 shadow-lg">
              {user?.full_name?.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-extrabold bg-white/20 text-purple-100 border border-white/30 mb-1.5">
                <GraduationCap className="w-3.5 h-3.5" /> Student Portal
              </div>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
                Welcome back, {user?.full_name.split(' ')[0]} 👋
              </h2>
              <p className="text-xs sm:text-sm text-purple-100/90 font-medium mt-1">
                Campus activities and academic results are on track. Let's aim even higher! 🚀
              </p>
            </div>
          </div>

          {/* Right side stat chips */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-white/15 border border-white/25 backdrop-blur-sm">
              <Clock className="w-5 h-5 text-amber-300" />
              <div>
                <p className="text-[10px] uppercase font-extrabold text-purple-200">Study Hours</p>
                <p className="text-sm font-black">48 hrs</p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-white/15 border border-white/25 backdrop-blur-sm">
              <BookOpen className="w-5 h-5 text-cyan-300" />
              <div>
                <p className="text-[10px] uppercase font-extrabold text-purple-200">Active Courses</p>
                <p className="text-sm font-black">6 Subjects</p>
              </div>
            </div>

            <Link
              href="/study-buddy"
              className="px-4 py-3 rounded-2xl bg-white text-purple-700 hover:bg-purple-50 font-black text-xs shadow-md transition-all flex items-center gap-2 border border-white/60"
            >
              <Sparkles className="w-4 h-4 text-amber-500" />
              AI Study Buddy →
            </Link>
          </div>
        </div>
      </div>

      {/* Colorful 4-Column KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <LmsKpiCard
          variant="magenta"
          value={pendingTasks.length}
          label="Pending Assignments"
          percentage={75}
          progressText={urgentTasks.length > 0 ? `${urgentTasks.length} high priority deadline` : 'On track for submission'}
          href="/tasks"
          icon={<CheckSquare className="w-5 h-5" />}
        />
        <LmsKpiCard
          variant="purple"
          value={`${avgAttendance}%`}
          label="Avg Attendance Rate"
          percentage={avgAttendance}
          progressText={lowAttendance.length > 0 ? `${lowAttendance.length} subject(s) need attention` : 'Healthy attendance record'}
          href="/attendance"
          icon={<ClipboardList className="w-5 h-5" />}
        />
        <LmsKpiCard
          variant="blue"
          value={notifications?.unreadCount ?? 3}
          label="Unread Alerts"
          percentage={92}
          progressText="Campus notices & deadlines"
          href="/notifications"
          icon={<Bell className="w-5 h-5" />}
        />
        <LmsKpiCard
          variant="cyan"
          value="Active"
          label="AI Study Companion"
          percentage={89}
          progressText="Flashcards & Quiz generator ready"
          href="/study-buddy"
          icon={<BookOpen className="w-5 h-5" />}
        />
      </div>

      {/* Grid: Upcoming Tasks + Attendance Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Tasks */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-5 border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h2 className="font-extrabold text-base tracking-tight text-slate-900 dark:text-slate-100">
                Upcoming Tasks & Assignments
              </h2>
              <p className="text-xs text-slate-500 font-medium">Pending items sorted by priority</p>
            </div>
            <Link href="/tasks" className="text-xs font-bold text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1">
              View All <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {pendingTasks.length === 0 ? (
            <EmptyState icon={<CheckSquare className="w-8 h-8 text-slate-400" />} text="No pending tasks found" />
          ) : (
            <div className="space-y-2.5">
              {pendingTasks.slice(0, 4).map((task: { id: string; title: string; deadline_at: string; priority: string; status: string }) => (
                <TaskRow key={task.id} task={task} />
              ))}
            </div>
          )}
        </div>

        {/* Subject Attendance Summary */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-5 border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h2 className="font-extrabold text-base tracking-tight text-slate-900 dark:text-slate-100">
                Course Attendance Status
              </h2>
              <p className="text-xs text-slate-500 font-medium">Current semester subject breakdown</p>
            </div>
            <Link href="/attendance" className="text-xs font-bold text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1">
              Details <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {!attendance?.data?.length ? (
            <div className="space-y-3.5">
              <AttendanceRow subject={{ subject_id: 'sub-1', subject_name: 'Data Structures & Algorithms', percentage: 92, attended: 23, total: 25 }} />
              <AttendanceRow subject={{ subject_id: 'sub-2', subject_name: 'Database Management Systems', percentage: 84, attended: 21, total: 25 }} />
              <AttendanceRow subject={{ subject_id: 'sub-3', subject_name: 'Operating Systems', percentage: 70, attended: 14, total: 20 }} />
              <AttendanceRow subject={{ subject_id: 'sub-4', subject_name: 'Software Engineering', percentage: 95, attended: 19, total: 20 }} />
            </div>
          ) : (
            <div className="space-y-3.5">
              {attendance.data.slice(0, 5).map((subject: { subject_id: string; subject_name: string; percentage: number; attended: number; total: number }) => (
                <AttendanceRow key={subject.subject_id} subject={subject} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Action Navigation Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Study Groups', href: '/study-groups', icon: <Users className="w-5 h-5 text-purple-600" /> },
          { label: 'Placement Tracker', href: '/placement', icon: <Briefcase className="w-5 h-5 text-blue-600" /> },
          { label: 'AI Flashcards', href: '/study-buddy?tab=flashcards', icon: <BookOpen className="w-5 h-5 text-cyan-600" /> },
          { label: 'Campus Notices', href: '/notices', icon: <Bell className="w-5 h-5 text-pink-600" /> },
        ].map(link => (
          <Link
            key={link.href}
            href={link.href}
            className="card p-4 flex flex-col items-center gap-2 text-center hover:border-purple-500 hover:shadow-md transition-all group"
          >
            <span className="p-2 rounded-xl bg-purple-50 dark:bg-slate-800 group-hover:scale-110 transition-transform">
              {link.icon}
            </span>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{link.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

function TeacherDashboard() {
  const { user, isDemoMode } = useAuth();

  const { data: notices } = useQuery({
    queryKey: ['notices', 'recent'],
    queryFn: () => api.get('/notices?limit=5').then(r => r.data),
  });

  const { data: subjects } = useQuery({
    queryKey: ['attendance', 'subjects'],
    queryFn: () => api.get('/attendance/subjects').then(r => r.data),
    enabled: !isDemoMode,
  });

  const demoSubjects = [
    { id: 'sub-1', name: 'Data Structures & Algorithms', code: 'CS301' },
    { id: 'sub-2', name: 'Operating Systems', code: 'CS302' },
  ];
  const teacherCourses = isDemoMode ? demoSubjects : (subjects?.data ?? []);

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Teacher Portal"
        category="Home"
        breadcrumb="Teacher Dashboard"
      />

      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-purple-700 via-violet-700 to-indigo-800 text-white rounded-3xl p-6 sm:p-7 shadow-xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-white/20 text-purple-100 border border-white/30 mb-2">
              <UserCheck className="w-3.5 h-3.5" /> Faculty Console
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Welcome back, {user?.full_name}! 👋
            </h1>
            <p className="text-xs sm:text-sm text-purple-100/90 mt-1 font-medium">
              Manage assigned class rosters, daily attendance logs, and broadcast announcements.
            </p>
          </div>
          <Link
            href="/attendance"
            className="btn-primary text-xs py-2.5 px-5 shadow-lg shrink-0 border border-white/30"
          >
            Mark Daily Attendance →
          </Link>
        </div>
      </div>

      {/* Quick Action Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <LmsKpiCard
          variant="purple"
          value="Mark Roster"
          label="Daily Attendance"
          percentage={94}
          progressText="CS301 & CS302 classes active"
          href="/attendance"
          icon={<ClipboardList className="w-5 h-5" />}
        />
        <LmsKpiCard
          variant="blue"
          value="Post Notice"
          label="Faculty Notices"
          percentage={88}
          progressText="AI auto-summarized announcements"
          href="/notices"
          icon={<Bell className="w-5 h-5" />}
        />
        <LmsKpiCard
          variant="cyan"
          value="Roster Info"
          label="Student Roster"
          percentage={96}
          progressText="View student analytics & alerts"
          href="/students"
          icon={<Users className="w-5 h-5" />}
        />
      </div>

      {/* Assigned Courses Section */}
      <div className="card p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <h2 className="font-extrabold text-base text-slate-900 dark:text-slate-100">
              Assigned Courses ({teacherCourses.length})
            </h2>
            <p className="text-xs text-slate-500 font-medium">Active subjects assigned to your faculty profile</p>
          </div>
          <Link href="/attendance" className="text-xs font-bold text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1">
            Attendance Portal <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {teacherCourses.length === 0 ? (
          <EmptyState icon={<BookOpen className="w-8 h-8 text-slate-400" />} text="No courses assigned yet" />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {teacherCourses.map((sub: { id: string; name: string; code: string }) => (
              <div key={sub.id} className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">{sub.name}</h3>
                  <p className="text-xs font-extrabold text-purple-600 dark:text-purple-400 mt-0.5">{sub.code}</p>
                </div>
                <Link href="/attendance" className="btn-primary py-1.5 px-3 text-xs">
                  Mark Attendance
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Notices */}
      <div className="card p-6">
        <h2 className="font-extrabold text-base text-slate-900 dark:text-slate-100 mb-4 border-b border-slate-100 dark:border-slate-800 pb-3">
          Recent Department Notices
        </h2>
        {!notices?.data?.length ? (
          <EmptyState icon={<Bell className="w-8 h-8 text-slate-400" />} text="No notices posted yet" />
        ) : (
          <div className="space-y-2.5">
            {notices.data.map((notice: { id: string; title: string; created_at: string; ai_summary: string }) => (
              <Link key={notice.id} href={`/notices/${notice.id}`} className="flex items-start gap-3 p-3.5 rounded-xl hover:bg-slate-100/70 dark:hover:bg-slate-800/60 transition-colors">
                <Bell className="w-4 h-4 mt-0.5 text-purple-600 shrink-0" />
                <div>
                  <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">{notice.title}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {formatDistanceToNow(new Date(notice.created_at), { addSuffix: true })}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ParentDashboard() {
  const [selectedChildId, setSelectedChildId] = useState<string>('');

  const { data: childrenData } = useQuery({
    queryKey: ['parent', 'children'],
    queryFn: () => api.get('/users/children').then(r => r.data),
  });

  const children: Array<{ id: string; full_name: string; email: string; branch?: string; year?: number }> = childrenData?.data ?? [];
  const activeChildId = selectedChildId || children[0]?.id || '';
  const activeChild = children.find(c => c.id === activeChildId) || children[0];

  const { data: tasks } = useQuery({
    queryKey: ['tasks', 'child', activeChildId],
    queryFn: () => api.get(activeChildId ? `/tasks?studentId=${activeChildId}&limit=5` : '/tasks?limit=5').then(r => r.data),
    enabled: !!activeChildId,
  });

  const { data: attendance } = useQuery({
    queryKey: ['attendance', 'summary', 'child', activeChildId],
    queryFn: () => api.get(activeChildId ? `/attendance/summary?studentId=${activeChildId}` : '/attendance/summary').then(r => r.data),
    enabled: !!activeChildId,
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Parent Dashboard"
        category="Home"
        breadcrumb="Parent Portal"
        actions={
          children.length > 1 ? (
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Child:</span>
              <select
                className="input py-1.5 px-3 text-xs font-bold w-auto"
                value={activeChildId}
                onChange={e => setSelectedChildId(e.target.value)}
              >
                {children.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.full_name} ({c.branch} - Yr {c.year})
                  </option>
                ))}
              </select>
            </div>
          ) : undefined
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <h2 className="font-extrabold text-base text-slate-900 dark:text-slate-100 mb-4 border-b border-slate-100 dark:border-slate-800 pb-3">
            {activeChild ? `${activeChild.full_name.split(' ')[0]}'s Assignments` : "Child's Tasks"}
          </h2>
          {!tasks?.data?.length ? (
            <EmptyState icon={<CheckSquare className="w-8 h-8 text-slate-400" />} text="No tasks recorded" />
          ) : (
            <div className="space-y-2.5">
              {tasks.data.map((task: { id: string; title: string; deadline_at: string; priority: string; status: string }) => (
                <TaskRow key={task.id} task={task} />
              ))}
            </div>
          )}
        </div>

        <div className="card p-6">
          <h2 className="font-extrabold text-base text-slate-900 dark:text-slate-100 mb-4 border-b border-slate-100 dark:border-slate-800 pb-3">
            {activeChild ? `${activeChild.full_name.split(' ')[0]}'s Attendance Summary` : "Attendance Summary"}
          </h2>
          {!attendance?.data?.length ? (
            <EmptyState icon={<ClipboardList className="w-8 h-8 text-slate-400" />} text="No attendance recorded" />
          ) : (
            <div className="space-y-3.5">
              {attendance.data.map((subject: { subject_id: string; subject_name: string; percentage: number; attended: number; total: number }) => (
                <AttendanceRow key={subject.subject_id} subject={subject} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AdminDashboard() {
  const { user } = useAuth();
  const { data: analytics } = useQuery({
    queryKey: ['admin', 'analytics'],
    queryFn: () => api.get('/admin/analytics').then(r => r.data),
  });

  const usersByRole = analytics?.users ?? [
    { role: 'student', count: 120 },
    { role: 'teacher', count: 18 },
    { role: 'parent', count: 95 },
    { role: 'admin', count: 4 },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Admin Dashboard"
        category="Home"
        breadcrumb="Admin Console"
      />

      {/* Welcome Banner inspired by Education & LMS Admin Dashboard reference */}
      <div className="bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-700 text-white rounded-3xl p-6 sm:p-7 shadow-xl relative overflow-hidden">
        <div className="absolute -right-8 -bottom-8 w-56 h-56 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white/20 border-2 border-white/40 flex items-center justify-center text-white text-2xl font-black shrink-0 shadow-lg">
              {user?.full_name?.charAt(0).toUpperCase() || 'A'}
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-extrabold bg-white/20 text-purple-100 border border-white/30 mb-1.5">
                <ShieldCheck className="w-3.5 h-3.5" /> Institution System Administrator
              </div>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
                Welcome back, {user?.full_name.split(' ')[0] || 'Alex'} 👋
              </h2>
              <p className="text-xs sm:text-sm text-purple-100/90 font-medium mt-1">
                Campus activities and academic results are on track. Let's aim even higher! 🚀
              </p>
            </div>
          </div>

          {/* Right side LMS status badges */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-white/15 border border-white/25 backdrop-blur-sm">
              <Clock className="w-5 h-5 text-amber-300" />
              <div>
                <p className="text-[10px] uppercase font-extrabold text-purple-200">Training Hours</p>
                <p className="text-sm font-black">98 Hours</p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-white/15 border border-white/25 backdrop-blur-sm">
              <BookOpen className="w-5 h-5 text-cyan-300" />
              <div>
                <p className="text-[10px] uppercase font-extrabold text-purple-200">Total Courses</p>
                <p className="text-sm font-black">7 Active</p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-white/15 border border-white/25 backdrop-blur-sm">
              <Award className="w-5 h-5 text-pink-300" />
              <div>
                <p className="text-[10px] uppercase font-extrabold text-purple-200">Certifications</p>
                <p className="text-sm font-black">3 Issued</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Colorful 4-Column KPI Cards Row (Pink, Purple, Blue, Cyan) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <LmsKpiCard
          variant="magenta"
          value="23"
          label="Enrolled Courses"
          percentage={75}
          progressText="14 active semester tracks"
          href="/admin/subjects"
          icon={<BookOpen className="w-5 h-5" />}
        />
        <LmsKpiCard
          variant="purple"
          value="34"
          label="Completed Tasks"
          percentage={60}
          progressText="Assignment submissions verified"
          href="/admin/analytics"
          icon={<CheckSquare className="w-5 h-5" />}
        />
        <LmsKpiCard
          variant="blue"
          value="7"
          label="Certificates Earned"
          percentage={92}
          progressText="Top academic distinction"
          href="/admin/users"
          icon={<Award className="w-5 h-5" />}
        />
        <LmsKpiCard
          variant="cyan"
          value="89h"
          label="Learning Hours"
          percentage={65}
          progressText="Total student engagement"
          href="/admin/analytics"
          icon={<Clock className="w-5 h-5" />}
        />
      </div>

      {/* Large Analytics Panels (Recharts Chart Container) */}
      <div className="card p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <h2 className="text-lg font-black tracking-tight text-slate-900 dark:text-slate-100">
              Course Enrollment & Attendance Trends
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Monthly analytics overview across department courses
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="badge bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300">
              2026 Semester
            </span>
          </div>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorEnroll" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#7C3AED" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorAttend" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06B6D4" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#06B6D4" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.5} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} />
              <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderColor: '#1e293b',
                  borderRadius: '12px',
                  color: '#fff',
                  fontSize: '12px',
                  fontWeight: 'bold',
                }}
              />
              <Area type="monotone" dataKey="enrollment" stroke="#7C3AED" strokeWidth={3} fillOpacity={1} fill="url(#colorEnroll)" name="Enrollment %" />
              <Area type="monotone" dataKey="attendance" stroke="#06B6D4" strokeWidth={3} fillOpacity={1} fill="url(#colorAttend)" name="Attendance %" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* User Directory Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-4 border-b border-slate-100 dark:border-slate-800 pb-3">
            <h2 className="font-extrabold text-base text-slate-900 dark:text-slate-100">
              Institution User Metrics
            </h2>
            <Link href="/admin/users" className="text-xs font-bold text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1">
              User Directory <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {usersByRole.map((r: { role: string; count: number }) => (
              <div key={r.role} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-center">
                <p className="text-2xl font-black text-slate-900 dark:text-slate-100">{r.count}</p>
                <p className="text-[11px] font-extrabold uppercase text-slate-500 mt-1 capitalize">{r.role}s</p>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-6">
          <h2 className="font-extrabold text-base text-slate-900 dark:text-slate-100 mb-4 border-b border-slate-100 dark:border-slate-800 pb-3">
            Quick Management Links
          </h2>
          <div className="space-y-2.5">
            {[
              { label: 'Course Subjects & Faculty', href: '/admin/subjects', icon: <BookOpen className="w-4 h-4 text-purple-600" /> },
              { label: 'Import Roster Users', href: '/admin/users', icon: <Users className="w-4 h-4 text-blue-600" /> },
              { label: 'Institution Setup', href: '/admin/institution', icon: <GraduationCap className="w-4 h-4 text-pink-600" /> },
              { label: 'Campus Analytics', href: '/admin/analytics', icon: <TrendingUp className="w-4 h-4 text-teal-600" /> },
            ].map(link => (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center justify-between p-3 rounded-xl hover:bg-purple-50/70 dark:hover:bg-slate-800 transition-colors border border-slate-100 dark:border-slate-800 group"
              >
                <div className="flex items-center gap-2.5">
                  <span className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800">{link.icon}</span>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{link.label}</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-purple-600 transition-colors" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Shared Sub-components
// ============================================================

function TaskRow({ task }: { task: { id: string; title: string; deadline_at: string; priority: string; status: string } }) {
  const priorityBadges: Record<string, string> = {
    urgent: 'badge-danger',
    high: 'badge-warning',
    medium: 'badge-info',
    low: '',
  };

  return (
    <Link
      href="/tasks"
      className="flex items-center gap-3 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 hover:border-purple-300 dark:hover:border-purple-700 bg-slate-50/40 dark:bg-slate-900/40 hover:bg-white dark:hover:bg-slate-900 transition-all shadow-xs"
    >
      <CheckSquare className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 truncate">{task.title}</p>
        {task.deadline_at && (
          <p className="text-[11px] text-slate-500 font-semibold mt-0.5 flex items-center gap-1">
            <Clock className="w-3 h-3 text-amber-500" />
            {formatDistanceToNow(new Date(task.deadline_at), { addSuffix: true })}
          </p>
        )}
      </div>
      <span className={`badge ${priorityBadges[task.priority] || 'badge-brand'} shrink-0`}>
        {task.priority}
      </span>
    </Link>
  );
}

function AttendanceRow({ subject }: { subject: { subject_id: string; subject_name: string; percentage: number; attended: number; total: number } }) {
  const pct = Number(subject.percentage);
  const colorClass = pct >= 75 ? 'text-emerald-600 dark:text-emerald-400' : pct >= 60 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400';

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <p className="font-bold text-slate-800 dark:text-slate-200 truncate">{subject.subject_name}</p>
        <p className={`font-black ml-2 shrink-0 ${colorClass}`}>{pct}%</p>
      </div>
      <div className="progress-bar h-2">
        <div
          className="progress-fill h-full"
          style={{
            width: `${pct}%`,
            background: pct >= 75 ? '#10B981' : pct >= 60 ? '#F59E0B' : '#EF4444',
          }}
        />
      </div>
    </div>
  );
}

function EmptyState({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex flex-col items-center py-8 text-center text-slate-400">
      <div className="mb-2 opacity-60">{icon}</div>
      <p className="text-xs font-bold">{text}</p>
    </div>
  );
}

export default function DashboardClient() {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <>
      {user.role === 'student' && <StudentDashboard />}
      {user.role === 'teacher' && <TeacherDashboard />}
      {user.role === 'parent' && <ParentDashboard />}
      {user.role === 'admin' && <AdminDashboard />}
    </>
  );
}
