'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { GraduationCap, Loader2, TrendingUp, TrendingDown } from 'lucide-react';

interface Student {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  branch?: string;
  year?: number;
}

interface AttendanceSummary {
  student_user_id: string;
  student_name: string;
  subject_name: string;
  subject_code: string;
  attended: number;
  total: number;
  percentage: number;
}

export default function StudentsPage() {
  const { data: students, isLoading: studentsLoading } = useQuery<{ data: Student[] }>({
    queryKey: ['teacher', 'students'],
    queryFn: () => api.get('/users?role=student').then(r => r.data),
  });

  const { data: attendance, isLoading: attendanceLoading } = useQuery<{ data: AttendanceSummary[] }>({
    queryKey: ['teacher', 'attendance-overview'],
    queryFn: () => api.get('/attendance/overview').then(r => r.data),
  });

  const isLoading = studentsLoading || attendanceLoading;

  // Group attendance by student
  const attByStudent = (attendance?.data ?? []).reduce<Record<string, AttendanceSummary[]>>((acc, r) => {
    if (!acc[r.student_user_id]) acc[r.student_user_id] = [];
    acc[r.student_user_id].push(r);
    return acc;
  }, {});

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <h1 className="page-title flex items-center gap-2">
          <GraduationCap className="w-6 h-6" style={{ color: 'var(--color-brand-primary)' }} />
          Students
        </h1>
        <p className="page-subtitle">Attendance overview for all students in your subjects</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--color-brand-primary)' }} />
        </div>
      ) : (
        <div className="space-y-3">
          {(students?.data ?? []).map(student => {
            const records = attByStudent[student.id] ?? [];
            const avgPct = records.length
              ? Math.round(records.reduce((sum, r) => sum + Number(r.percentage), 0) / records.length)
              : null;
            const atRisk = avgPct !== null && avgPct < 75;

            return (
              <div key={student.id} className="card p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold shrink-0"
                      style={{ background: 'linear-gradient(135deg, var(--color-brand-primary), hsl(286,75%,60%))' }}
                      aria-hidden="true"
                    >
                      {student.full_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{student.full_name}</p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {student.email}
                        {student.branch && ` · ${student.branch}`}
                        {student.year && ` · Year ${student.year}`}
                      </p>
                    </div>
                  </div>
                  {avgPct !== null && (
                    <div className={`flex items-center gap-1.5 text-sm font-semibold ${atRisk ? 'text-red-500' : 'text-emerald-500'}`}>
                      {atRisk ? <TrendingDown className="w-4 h-4" /> : <TrendingUp className="w-4 h-4" />}
                      {avgPct}% avg
                    </div>
                  )}
                </div>

                {records.length > 0 ? (
                  <div className="space-y-2">
                    {records.map(r => {
                      const pct = Number(r.percentage);
                      return (
                        <div key={r.subject_code}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                              {r.subject_name} <span style={{ color: 'var(--text-muted)' }}>({r.subject_code})</span>
                            </span>
                            <span className="text-xs font-semibold" style={{ color: pct < 75 ? 'var(--color-danger)' : pct < 85 ? 'var(--color-warning)' : 'var(--color-success)' }}>
                              {r.attended}/{r.total} · {pct}%
                            </span>
                          </div>
                          <div className="progress-bar h-1.5">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${pct}%`,
                                background: pct < 75 ? 'var(--color-danger)' : pct < 85 ? 'var(--color-warning)' : 'var(--color-success)',
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>No attendance data yet</p>
                )}
              </div>
            );
          })}
          {!(students?.data?.length) && (
            <div className="card p-16 text-center">
              <GraduationCap className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
              <p style={{ color: 'var(--text-muted)' }}>No students found in your subjects</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
