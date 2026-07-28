'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/Toaster';
import { Loader2, Users, AlertCircle } from 'lucide-react';

import { DEMO_ATTENDANCE_SUMMARY, DEMO_ATTENDANCE_RECORDS } from '@/lib/demoData';

import { PageHeader } from '@/components/layout/PageHeader';

interface AttendanceRecord {
  id: string;
  subject_name: string;
  subject_code?: string;
  student_name?: string;
  date: string;
  status: string;
  note?: string;
}

interface AttendanceSummary {
  subject_id: string;
  subject_name: string;
  code?: string;
  attended: number;
  total: number;
  percentage: number;
}

interface StudentUser {
  id: string;
  full_name: string;
  email: string;
}

const statusColors: Record<string, string> = {
  present: 'badge-success',
  absent: 'badge-danger',
  late: 'badge-warning',
  excused: 'badge-info',
};

export default function AttendancePage() {
  const { user, isDemoMode } = useAuth();
  const toast = useToast();
  const qc = useQueryClient();

  const isTeacherOrAdmin = user?.role === 'teacher' || user?.role === 'admin';
  const isParent = user?.role === 'parent';
  const [selectedChildId, setSelectedChildId] = useState('');

  // Fetch children if user is parent
  const { data: childrenData } = useQuery({
    queryKey: ['parent', 'children'],
    queryFn: () => api.get('/users/children').then(r => r.data),
    enabled: !isDemoMode && isParent,
  });

  const childrenList: Array<{ id: string; full_name: string }> = childrenData?.data ?? [];
  const activeChildId = selectedChildId || childrenList[0]?.id || '';


  // State for teacher / admin marking
  const [selectedSubject, setSelectedSubject] = useState('');
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [studentRecords, setStudentRecords] = useState<Record<string, string>>({});
  const [logSubjectFilter, setLogSubjectFilter] = useState('');

  // 1. Fetch student/parent summary
  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['attendance', 'summary', activeChildId],
    queryFn: () => api.get(activeChildId ? `/attendance/summary?studentId=${activeChildId}` : '/attendance/summary').then(r => r.data),
    enabled: !isDemoMode && !isTeacherOrAdmin,
  });

  // 2. Fetch recent attendance logs
  const { data: records, isLoading: recordsLoading } = useQuery({
    queryKey: ['attendance', 'records', activeChildId],
    queryFn: () => api.get(activeChildId ? `/attendance?studentId=${activeChildId}` : '/attendance').then(r => r.data),
    enabled: !isDemoMode,
  });

  // 3. Fetch subjects available to teacher/admin
  const { data: subjectsData } = useQuery({
    queryKey: ['attendance', 'subjects'],
    queryFn: () => api.get('/attendance/subjects').then(r => r.data),
    enabled: !isDemoMode && isTeacherOrAdmin,
  });

  // 4. Fetch enrolled students
  const { data: studentsData, isLoading: studentsLoading } = useQuery({
    queryKey: ['students', 'all'],
    queryFn: () => api.get('/users?role=student').then(r => r.data),
    enabled: !isDemoMode && isTeacherOrAdmin && !!selectedSubject,
  });

  // 5. Fetch existing attendance records
  const { data: existingAttendance } = useQuery({
    queryKey: ['attendance', 'existing', selectedSubject, attendanceDate],
    queryFn: () =>
      api.get(`/attendance?subjectId=${selectedSubject}&from=${attendanceDate}&to=${attendanceDate}`).then(r => r.data),
    enabled: !isDemoMode && isTeacherOrAdmin && !!selectedSubject && !!attendanceDate,
  });

  // Map existing DB attendance statuses
  const existingMap = useMemo(() => {
    const map: Record<string, string> = {};
    if (existingAttendance?.data && Array.isArray(existingAttendance.data)) {
      for (const rec of existingAttendance.data) {
        if (rec.student_user_id) {
          map[rec.student_user_id] = rec.status;
        }
      }
    }
    return map;
  }, [existingAttendance]);

  // Fallbacks for demo mode
  const demoSubjects = [
    { id: 'sub-1', name: 'Data Structures & Algorithms', code: 'CS301' },
    { id: 'sub-2', name: 'Operating Systems', code: 'CS302' },
  ];
  const demoStudents = [
    { id: 's1', full_name: 'Rahul Verma', email: 'rahul.verma@demo.edu' },
    { id: 's2', full_name: 'Sneha Patel', email: 'sneha.patel@demo.edu' },
    { id: 's3', full_name: 'Aditya Kumar', email: 'aditya.kumar@demo.edu' },
  ];

  const subjectsList = isDemoMode ? demoSubjects : (subjectsData?.data ?? []);
  const studentsList: StudentUser[] = isDemoMode ? demoStudents : (studentsData?.data ?? []);

  // Mutation to save attendance
  const markMutation = useMutation({
    mutationFn: (data: { subjectId: string; date: string; records: Array<{ studentUserId: string; status: string }> }) =>
      api.post('/attendance', data),
    onSuccess: () => {
      toast('success', 'Attendance marked successfully!');
      qc.invalidateQueries({ queryKey: ['attendance'] });
      qc.invalidateQueries({ queryKey: ['teacher'] });
      setStudentRecords({});
    },
    onError: (err: { response?: { data?: { message?: string } }; message?: string }) => {
      toast('error', err?.response?.data?.message || 'Failed to mark attendance');
    },
  });

  const handleSubmitAttendance = () => {
    if (!selectedSubject) {
      toast('error', 'Please select a subject');
      return;
    }
    if (!attendanceDate) {
      toast('error', 'Please select a valid date');
      return;
    }
    if (studentsList.length === 0) {
      toast('error', 'No students available to mark');
      return;
    }

    if (isDemoMode) {
      toast('success', 'Attendance marked successfully! (Demo mode)');
      return;
    }

    const payloadRecords = studentsList.map(s => ({
      studentUserId: s.id,
      status: studentRecords[s.id] ?? existingMap[s.id] ?? 'present',
    }));

    markMutation.mutate({
      subjectId: selectedSubject,
      date: attendanceDate,
      records: payloadRecords,
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title={isTeacherOrAdmin ? 'Class Attendance Portal' : 'Attendance Tracking'}
        category="Academics"
        breadcrumb="Attendance"
        actions={
          isParent && childrenList.length > 1 ? (
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Child:</span>
              <select
                className="input py-1.5 px-3 text-xs w-auto font-bold"
                value={activeChildId}
                onChange={e => setSelectedChildId(e.target.value)}
              >
                {childrenList.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.full_name}
                  </option>
                ))}
              </select>
            </div>
          ) : undefined
        }
      />


      {/* TEACHER / ADMIN ATTENDANCE MARKING PORTAL */}
      {isTeacherOrAdmin && (
        <div className="card p-6 space-y-5">
          <h2 className="font-extrabold text-lg tracking-tight" style={{ color: 'var(--text-primary)' }}>
            Mark / Update Class Attendance
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="att-subject" className="label">Select Course Subject *</label>
              <select
                id="att-subject"
                className="input font-semibold"
                value={selectedSubject}
                onChange={e => setSelectedSubject(e.target.value)}
              >
                <option value="">Choose assigned course subject...</option>
                {subjectsList.map((s: { id: string; name: string; code: string }) => (
                  <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="att-date" className="label">Session Date *</label>
              <input
                id="att-date"
                type="date"
                className="input font-semibold"
                value={attendanceDate}
                max={new Date().toISOString().split('T')[0]}
                onChange={e => setAttendanceDate(e.target.value)}
              />
            </div>
          </div>

          {selectedSubject && (
            <div className="border-t pt-5 space-y-4" style={{ borderColor: 'var(--border-default)' }}>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <p className="text-sm font-extrabold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                  <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  Student Roster ({studentsList.length} Students)
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="text-xs px-3 py-1.5 rounded-lg bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 font-bold hover:opacity-90 transition-opacity"
                    onClick={() => {
                      const allPresent: Record<string, string> = {};
                      studentsList.forEach(s => { allPresent[s.id] = 'present'; });
                      setStudentRecords(allPresent);
                    }}
                  >
                    Mark All Present
                  </button>
                  <button
                    type="button"
                    className="text-xs px-3 py-1.5 rounded-lg bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 font-bold hover:opacity-90 transition-opacity"
                    onClick={() => {
                      const allAbsent: Record<string, string> = {};
                      studentsList.forEach(s => { allAbsent[s.id] = 'absent'; });
                      setStudentRecords(allAbsent);
                    }}
                  >
                    Mark All Absent
                  </button>
                </div>
              </div>

              {studentsLoading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                </div>
              ) : studentsList.length === 0 ? (
                <div className="p-6 text-center text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
                  No students found for this institution or subject.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {studentsList.map(student => {
                    const currentStatus = studentRecords[student.id] ?? existingMap[student.id] ?? 'present';
                    return (
                      <div
                        key={student.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl border gap-3 transition-all hover:shadow-sm"
                        style={{ background: 'var(--bg-input)', borderColor: 'var(--border-default)' }}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-700 text-white flex items-center justify-center text-xs font-extrabold shrink-0 shadow-sm">
                            {student.full_name.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{student.full_name}</p>
                            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{student.email}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 self-end sm:self-auto">
                          {(['present', 'absent', 'late', 'excused'] as const).map(status => {
                            const isSelected = currentStatus === status;
                            return (
                              <button
                                key={status}
                                type="button"
                                className={`px-3 py-1 text-xs font-bold rounded-lg capitalize transition-all ${
                                  isSelected
                                    ? statusColors[status]
                                    : 'bg-[var(--bg-card)] border text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                                }`}
                                style={!isSelected ? { borderColor: 'var(--border-default)' } : undefined}
                                onClick={() => setStudentRecords(prev => ({ ...prev, [student.id]: status }))}
                              >
                                {status}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="pt-3 flex justify-end">
                <button
                  type="button"
                  className="btn-primary py-2.5 px-6 font-bold shadow-md"
                  disabled={markMutation.isPending || studentsList.length === 0}
                  onClick={handleSubmitAttendance}
                >
                  {markMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    'Submit Class Attendance'
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* STUDENT / PARENT ATTENDANCE SUMMARY CARDS */}
      {!isTeacherOrAdmin && (
        <>
          {summaryLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {(isDemoMode ? DEMO_ATTENDANCE_SUMMARY : (summary?.data ?? [])).map((subject: AttendanceSummary) => {
                const pct = Number(subject.percentage);
                const color = pct >= 75 ? 'var(--color-success)' : pct >= 60 ? 'var(--color-warning)' : 'var(--color-danger)';
                const isRisk = pct < 75;

                return (
                  <div key={subject.subject_id} className="card p-5 relative overflow-hidden">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-bold text-sm sm:text-base tracking-tight" style={{ color: 'var(--text-primary)' }}>
                          {subject.subject_name}
                        </h3>
                        <p className="text-xs font-semibold mt-0.5" style={{ color: 'var(--text-muted)' }}>{subject.code}</p>
                      </div>
                      <span className="text-2xl font-black" style={{ color }}>
                        {pct}%
                      </span>
                    </div>
                    <div className="progress-bar h-2 mb-2">
                      <div className="progress-fill h-full" style={{ width: `${pct}%`, background: color }} />
                    </div>
                    <p className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
                      {subject.attended} / {subject.total} sessions attended
                    </p>
                    {isRisk && (
                      <div className="mt-3 p-2 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 flex items-center gap-1.5 text-xs font-bold text-rose-600 dark:text-rose-300">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>Below 75% requirement threshold</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* RECENT ATTENDANCE RECORDS LOG (FOR ALL ROLES) */}
      <div className="card">
        <div className="p-5 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3" style={{ borderColor: 'var(--border-default)' }}>
          <div>
            <h2 className="font-extrabold text-base tracking-tight" style={{ color: 'var(--text-primary)' }}>Recent Attendance Logs</h2>
            <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Detailed session-by-session attendance history</p>
          </div>
          {subjectsList.length > 0 && (
            <select
              className="input max-w-xs text-xs py-1.5 font-semibold"
              value={logSubjectFilter}
              onChange={e => setLogSubjectFilter(e.target.value)}
            >
              <option value="">All Subjects</option>
              {subjectsList.map((s: { id: string; name: string; code: string }) => (
                <option key={s.id} value={s.name}>{s.name} ({s.code})</option>
              ))}
            </select>
          )}
        </div>
        {recordsLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          </div>
        ) : (
          <div className="table-wrapper border-0">
            <table aria-label="Attendance records">
              <thead>
                <tr>
                  <th scope="col">Student</th>
                  <th scope="col">Subject</th>
                  <th scope="col">Date</th>
                  <th scope="col">Status</th>
                  <th scope="col">Note</th>
                </tr>
              </thead>
              <tbody>
                {(isDemoMode
                  ? DEMO_ATTENDANCE_RECORDS
                  : (records?.data ?? []).filter((r: AttendanceRecord) => !logSubjectFilter || r.subject_name === logSubjectFilter)
                ).slice(0, 50).map((rec: AttendanceRecord) => (
                  <tr key={rec.id}>
                    <td className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
                      {rec.student_name ?? user?.full_name ?? 'Student'}
                    </td>
                    <td className="font-semibold">{rec.subject_name} <span style={{ color: 'var(--text-muted)' }}>({rec.subject_code})</span></td>
                    <td className="font-medium">{new Date(rec.date).toLocaleDateString('en-IN')}</td>
                    <td>
                      <span className={`badge ${statusColors[rec.status] || ''} capitalize font-bold`}>
                        {rec.status}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-muted)' }}>{rec.note ?? '—'}</td>
                  </tr>
                ))}
                {!(isDemoMode ? DEMO_ATTENDANCE_RECORDS.length : records?.data?.length) && (
                  <tr>
                    <td colSpan={5} className="text-center py-8 font-medium" style={{ color: 'var(--text-muted)' }}>
                      No attendance records found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
