'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import {
  CheckSquare, ClipboardList, Bell, TrendingUp,
  BookOpen, Briefcase, Users,
  ArrowRight, Clock,
} from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';

// ============================================================
// Role-specific dashboard widgets
// ============================================================

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
    : null;
  const lowAttendance = attendance?.data?.filter((s: { percentage: number }) => Number(s.percentage) < 75) ?? [];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome */}
      <div className="page-header">
        <h1 className="page-title">
          Good {getTimeOfDay()}, {user?.full_name.split(' ')[0]}! 👋
        </h1>
        <p className="page-subtitle">Here's your academic overview for today.</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          icon={<CheckSquare className="w-5 h-5" />}
          label="Pending Tasks"
          value={pendingTasks.length}
          href="/tasks"
          color="brand"
          note={urgentTasks.length > 0 ? `${urgentTasks.length} urgent` : undefined}
        />
        <StatCard
          icon={<ClipboardList className="w-5 h-5" />}
          label="Avg. Attendance"
          value={avgAttendance !== null ? `${avgAttendance}%` : '—'}
          href="/attendance"
          color={avgAttendance !== null && avgAttendance < 75 ? 'danger' : 'success'}
          note={lowAttendance.length > 0 ? `${lowAttendance.length} subject(s) at risk` : undefined}
        />
        <StatCard
          icon={<Bell className="w-5 h-5" />}
          label="Unread Notifications"
          value={notifications?.unreadCount ?? 0}
          href="/notifications"
          color="info"
        />
        <StatCard
          icon={<BookOpen className="w-5 h-5" />}
          label="Study Buddy"
          value="Chat →"
          href="/study-buddy"
          color="purple"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Tasks */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-base" style={{ color: 'var(--text-primary)' }}>
              Upcoming Tasks
            </h2>
            <Link href="/tasks" className="text-xs font-medium flex items-center gap-1" style={{ color: 'var(--text-brand)' }}>
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {pendingTasks.length === 0 ? (
            <EmptyState icon={<CheckSquare className="w-8 h-8" />} text="No pending tasks" />
          ) : (
            <div className="space-y-2">
              {pendingTasks.slice(0, 4).map((task: { id: string; title: string; deadline_at: string; priority: string; status: string }) => (
                <TaskRow key={task.id} task={task} />
              ))}
            </div>
          )}
        </div>

        {/* Attendance Summary */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-base" style={{ color: 'var(--text-primary)' }}>
              Attendance
            </h2>
            <Link href="/attendance" className="text-xs font-medium flex items-center gap-1" style={{ color: 'var(--text-brand)' }}>
              Details <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {!attendance?.data?.length ? (
            <EmptyState icon={<ClipboardList className="w-8 h-8" />} text="No attendance data" />
          ) : (
            <div className="space-y-3">
              {attendance.data.slice(0, 5).map((subject: { subject_id: string; subject_name: string; percentage: number; attended: number; total: number }) => (
                <AttendanceRow key={subject.subject_id} subject={subject} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Study Groups', href: '/study-groups', icon: <Users className="w-5 h-5" /> },
          { label: 'Placement', href: '/placement', icon: <Briefcase className="w-5 h-5" /> },
          { label: 'Flashcards', href: '/study-buddy?tab=flashcards', icon: <BookOpen className="w-5 h-5" /> },
          { label: 'Notices', href: '/notices', icon: <Bell className="w-5 h-5" /> },
        ].map(link => (
          <Link
            key={link.href}
            href={link.href}
            className="card p-4 flex flex-col items-center gap-2 text-center hover:shadow-md transition-all"
          >
            <span style={{ color: 'var(--color-brand-primary)' }}>{link.icon}</span>
            <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
              {link.label}
            </span>
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
      <div className="page-header">
        <h1 className="page-title">Teacher Dashboard</h1>
        <p className="page-subtitle">Welcome back, {user?.full_name}! Manage your classes and attendance.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link href="/attendance" className="stat-card hover:shadow-md transition-all">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <ClipboardList className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Mark Attendance</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Record today's class</p>
            </div>
          </div>
        </Link>
        <Link href="/notices" className="stat-card hover:shadow-md transition-all">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
              <Bell className="w-5 h-5 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Post Notice</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>AI-summarized broadcast</p>
            </div>
          </div>
        </Link>
        <Link href="/students" className="stat-card hover:shadow-md transition-all">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-sky-100 dark:bg-sky-900/30 flex items-center justify-center">
              <Users className="w-5 h-5 text-sky-600 dark:text-sky-400" />
            </div>
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Students & Reports</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>View attendance analytics</p>
            </div>
          </div>
        </Link>
      </div>

      {/* Assigned Courses Section */}
      <div className="card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-base" style={{ color: 'var(--text-primary)' }}>
            My Assigned Courses ({teacherCourses.length})
          </h2>
          <Link href="/attendance" className="text-xs font-medium flex items-center gap-1" style={{ color: 'var(--text-brand)' }}>
            Attendance Portal <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {teacherCourses.length === 0 ? (
          <EmptyState icon={<BookOpen className="w-8 h-8" />} text="No courses assigned to you yet" />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {teacherCourses.map((sub: { id: string; name: string; code: string }) => (
              <div key={sub.id} className="p-4 rounded-xl border flex items-center justify-between" style={{ borderColor: 'var(--border-default)', background: 'var(--bg-input)' }}>
                <div>
                  <h4 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{sub.name}</h4>
                  <p className="text-xs font-semibold mt-0.5" style={{ color: 'var(--color-brand-primary)' }}>{sub.code}</p>
                </div>
                <Link href="/attendance" className="btn-primary text-xs py-1.5 px-3">
                  Mark Attendance
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card p-5">
        <h2 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Recent Notices</h2>
        {!notices?.data?.length ? (
          <EmptyState icon={<Bell className="w-8 h-8" />} text="No notices posted yet" />
        ) : (
          <div className="space-y-3">
            {notices.data.map((notice: { id: string; title: string; created_at: string; ai_summary: string }) => (
              <Link key={notice.id} href={`/notices/${notice.id}`} className="flex items-start gap-3 p-3 rounded-lg hover:bg-[var(--bg-card-hover)] transition-colors">
                <Bell className="w-4 h-4 mt-0.5 shrink-0" style={{ color: 'var(--text-muted)' }} />
                <div>
                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{notice.title}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="page-header mb-0">
          <h1 className="page-title">Parent Dashboard</h1>
          <p className="page-subtitle">Monitoring academic progress for {activeChild ? activeChild.full_name : 'your child'}</p>
        </div>
        {children.length > 1 && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>Child:</span>
            <select
              className="input py-1.5 px-3 text-xs w-auto font-medium"
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
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-5">
          <h2 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
            {activeChild ? `${activeChild.full_name.split(' ')[0]}'s Tasks` : "Child's Tasks"}
          </h2>
          {!tasks?.data?.length ? (
            <EmptyState icon={<CheckSquare className="w-8 h-8" />} text="No tasks found" />
          ) : (
            <div className="space-y-2">
              {tasks.data.map((task: { id: string; title: string; deadline_at: string; priority: string; status: string }) => (
                <TaskRow key={task.id} task={task} />
              ))}
            </div>
          )}
        </div>

        <div className="card p-5">
          <h2 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
            {activeChild ? `${activeChild.full_name.split(' ')[0]}'s Attendance Summary` : "Attendance Summary"}
          </h2>
          {!attendance?.data?.length ? (
            <EmptyState icon={<ClipboardList className="w-8 h-8" />} text="No attendance data" />
          ) : (
            <div className="space-y-3">
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
  const { data: analytics } = useQuery({
    queryKey: ['admin', 'analytics'],
    queryFn: () => api.get('/admin/analytics').then(r => r.data),
  });

  const usersByRole = analytics?.users ?? [];
  const tasksByStatus = analytics?.tasks ?? [];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Admin Dashboard</h1>
        <p className="page-subtitle">Institution-wide overview</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {usersByRole.map((r: { role: string; count: number }) => (
          <div key={r.role} className="stat-card">
            <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{r.count}</p>
            <p className="text-sm capitalize mt-1" style={{ color: 'var(--text-muted)' }}>{r.role}s</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card p-5">
          <h2 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Task Status</h2>
          <div className="space-y-2">
            {tasksByStatus.map((s: { status: string; count: number }) => (
              <div key={s.status} className="flex items-center justify-between">
                <span className="text-sm capitalize" style={{ color: 'var(--text-secondary)' }}>{s.status.replace('_', ' ')}</span>
                <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{s.count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-5">
          <h2 className="font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Avg Attendance</h2>
          <p className="text-3xl font-bold" style={{ color: analytics?.avgAttendance >= 75 ? 'var(--color-success)' : 'var(--color-danger)' }}>
            {analytics?.avgAttendance ?? '—'}%
          </p>
          <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>Institution-wide average</p>
        </div>

        <div className="card p-5">
          <h2 className="font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Total Notices</h2>
          <p className="text-3xl font-bold" style={{ color: 'var(--color-brand-primary)' }}>
            {analytics?.noticesTotal ?? '—'}
          </p>
          <Link href="/notices" className="text-xs mt-2 flex items-center gap-1" style={{ color: 'var(--text-brand)' }}>
            View all <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Subjects & Faculty', href: '/admin/subjects', icon: <BookOpen className="w-5 h-5" /> },
          { label: 'Import Users', href: '/admin/users', icon: <Users className="w-5 h-5" /> },
          { label: 'Analytics', href: '/admin/analytics', icon: <TrendingUp className="w-5 h-5" /> },
          { label: 'Post Notice', href: '/notices', icon: <Bell className="w-5 h-5" /> },
        ].map(link => (
          <Link key={link.href} href={link.href} className="card p-4 flex flex-col items-center gap-2 text-center hover:shadow-md transition-all">
            <span style={{ color: 'var(--color-brand-primary)' }}>{link.icon}</span>
            <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{link.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// Shared sub-components
// ============================================================

function StatCard({
  icon, label, value, href, color, note,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  href: string;
  color: string;
  note?: string;
}) {
  const colorMap: Record<string, string> = {
    brand: 'bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400',
    success: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400',
    danger: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
    info: 'bg-sky-100 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400',
    purple: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
  };

  return (
    <Link href={href} className="stat-card hover:shadow-md transition-all group">
      <div className="flex items-center justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colorMap[color] ?? colorMap.brand}`}>
          {icon}
        </div>
        <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: 'var(--text-muted)' }} />
      </div>
      <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{value}</p>
      <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>{label}</p>
      {note && <p className="text-xs mt-0.5 font-medium text-amber-600 dark:text-amber-400">{note}</p>}
    </Link>
  );
}

function TaskRow({ task }: { task: { id: string; title: string; deadline_at: string; priority: string; status: string } }) {
  const priorityColors: Record<string, string> = {
    urgent: 'badge-danger',
    high: 'badge-warning',
    medium: 'badge-info',
    low: '',
  };

  return (
    <Link
      href={`/tasks/${task.id}`}
      className="flex items-center gap-3 p-3 rounded-lg hover:bg-[var(--bg-card-hover)] transition-colors"
    >
      <CheckSquare className="w-4 h-4 shrink-0" style={{ color: 'var(--text-muted)' }} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{task.title}</p>
        {task.deadline_at && (
          <p className="text-xs mt-0.5 flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
            <Clock className="w-3 h-3" />
            {formatDistanceToNow(new Date(task.deadline_at), { addSuffix: true })}
          </p>
        )}
      </div>
      <span className={`badge ${priorityColors[task.priority] ?? ''} shrink-0`}>{task.priority}</span>
    </Link>
  );
}

function AttendanceRow({ subject }: { subject: { subject_id: string; subject_name: string; percentage: number; attended: number; total: number } }) {
  const pct = Number(subject.percentage);
  const color = pct >= 75 ? 'var(--color-success)' : pct >= 60 ? 'var(--color-warning)' : 'var(--color-danger)';

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <p className="text-sm truncate" style={{ color: 'var(--text-primary)' }}>{subject.subject_name}</p>
        <p className="text-sm font-semibold ml-2 shrink-0" style={{ color }}>{pct}%</p>
      </div>
      <div className="progress-bar h-1.5">
        <div className="progress-fill h-full" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

function EmptyState({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex flex-col items-center py-8" style={{ color: 'var(--text-muted)' }}>
      <div className="mb-2">{icon}</div>
      <p className="text-sm">{text}</p>
    </div>
  );
}

function getTimeOfDay() {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}

// ============================================================
// Main export — role-routing
// ============================================================
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
