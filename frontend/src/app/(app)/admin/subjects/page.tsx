'use client';

import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useToast } from '@/components/ui/Toaster';
import { useAuth } from '@/contexts/AuthContext';
import {
  BookOpen, Plus, UserPlus, Trash2, Loader2, X,
  GraduationCap, Upload, Download, CheckCircle,
  FileSpreadsheet, Layers
} from 'lucide-react';

interface AssignedTeacher {
  assignmentId: string;
  teacherId: string;
  fullName: string;
  email: string;
}

interface Subject {
  id: string;
  name: string;
  code: string;
  branch?: string;
  year?: number;
  credits?: number;
  teachers?: AssignedTeacher[];
}

interface TeacherUser {
  id: string;
  full_name: string;
  email: string;
}

type AdminTab = 'subjects' | 'enrollments' | 'csv-import';

export default function AdminSubjectsPage() {
  const { isDemoMode } = useAuth();
  const toast = useToast();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<AdminTab>('subjects');

  // Modals & State
  const [showAddSubject, setShowAddSubject] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showBulkEnrollModal, setShowBulkEnrollModal] = useState(false);
  const [selectedSubjectForAssign, setSelectedSubjectForAssign] = useState<string>('');
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('');

  // Bulk Enroll state
  const [enrollForm, setEnrollForm] = useState({
    subjectId: '',
    branch: 'CSE',
    year: 3,
  });

  // CSV Import state
  const [importResult, setImportResult] = useState<{ created: number; skipped: number; errors: string[] } | null>(null);

  // Subject Form State
  const [subjectForm, setSubjectForm] = useState({
    name: '',
    code: '',
    branch: 'CSE',
    year: 3,
    credits: 4,
  });

  // Demo state fallbacks
  const [demoSubjects, setDemoSubjects] = useState<Subject[]>([
    {
      id: 'sub-1',
      name: 'Data Structures & Algorithms',
      code: 'CS301',
      branch: 'CSE',
      year: 3,
      credits: 4,
      teachers: [
        { assignmentId: 'ts-1', teacherId: 'demo-teacher-1', fullName: 'Prof. Priya Sharma', email: 'priya.sharma@demo-university.edu' }
      ]
    },
    {
      id: 'sub-2',
      name: 'Operating Systems',
      code: 'CS302',
      branch: 'CSE',
      year: 3,
      credits: 4,
      teachers: [
        { assignmentId: 'ts-2', teacherId: 'demo-teacher-1', fullName: 'Prof. Priya Sharma', email: 'priya.sharma@demo-university.edu' }
      ]
    },
    {
      id: 'sub-3',
      name: 'Linear Algebra',
      code: 'MA201',
      branch: 'CSE',
      year: 2,
      credits: 3,
      teachers: [
        { assignmentId: 'ts-3', teacherId: 'demo-teacher-2', fullName: 'Prof. Arjun Mehta', email: 'arjun.mehta@demo-university.edu' }
      ]
    },
  ]);

  const demoTeachers: TeacherUser[] = [
    { id: 'demo-teacher-1', full_name: 'Prof. Priya Sharma', email: 'priya.sharma@demo-university.edu' },
    { id: 'demo-teacher-2', full_name: 'Prof. Arjun Mehta', email: 'arjun.mehta@demo-university.edu' },
  ];

  // Queries — fetch live data directly from database
  const { data: subjectsData } = useQuery({
    queryKey: ['admin', 'subjects'],
    queryFn: () => api.get('/admin/subjects').then(r => r.data),
  });

  const { data: teachersData } = useQuery({
    queryKey: ['admin', 'teachers'],
    queryFn: () => api.get('/users?role=teacher').then(r => r.data),
  });

  const subjects: Subject[] = (subjectsData?.data && subjectsData.data.length > 0) ? subjectsData.data : (isDemoMode ? demoSubjects : (subjectsData?.data ?? []));
  const teachers: TeacherUser[] = (teachersData?.data && teachersData.data.length > 0) ? teachersData.data : (isDemoMode ? demoTeachers : (teachersData?.data ?? []));

  // Mutations
  const createSubjectMutation = useMutation({
    mutationFn: (data: typeof subjectForm) => api.post('/admin/subjects', data),
    onSuccess: () => {
      toast('success', 'Subject created!');
      qc.invalidateQueries({ queryKey: ['admin', 'subjects'] });
      setShowAddSubject(false);
      setSubjectForm({ name: '', code: '', branch: 'CSE', year: 3, credits: 4 });
    },
  });

  const assignMutation = useMutation({
    mutationFn: ({ subjectId, teacherUserId }: { subjectId: string; teacherUserId: string }) =>
      api.post('/admin/assign-subject', { subjectId, teacherUserId }),
    onSuccess: () => {
      toast('success', 'Teacher assigned to subject!');
      qc.invalidateQueries({ queryKey: ['admin', 'subjects'] });
      setShowAssignModal(false);
      setSelectedSubjectForAssign('');
      setSelectedTeacherId('');
    },
    onError: (err: { response?: { data?: { message?: string } }; message?: string }) => {
      const msg = err?.response?.data?.message || err?.message || 'Failed to assign teacher';
      toast('error', msg);
    },
  });

  const unassignMutation = useMutation({
    mutationFn: (assignmentId: string) => api.delete(`/admin/assign-subject/${assignmentId}`),
    onSuccess: () => {
      toast('success', 'Teacher unassigned!');
      qc.invalidateQueries({ queryKey: ['admin', 'subjects'] });
    },
    onError: (err: { response?: { data?: { message?: string } }; message?: string }) => {
      const msg = err?.response?.data?.message || err?.message || 'Failed to unassign teacher';
      toast('error', msg);
    },
  });

  const bulkEnrollMutation = useMutation({
    mutationFn: (data: typeof enrollForm) => api.post('/admin/enroll-class', data).then(r => r.data),
    onSuccess: (data: { message?: string }) => {
      toast('success', data.message || 'Class enrolled in subject!');
      setShowBulkEnrollModal(false);
    },
    onError: () => toast('error', 'Failed to enroll class'),
  });

  const importMutation = useMutation({
    mutationFn: (file: File) => {
      const fd = new FormData();
      fd.append('file', file);
      return api.post('/admin/import-users', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }).then(r => r.data);
    },
    onSuccess: (res) => {
      setImportResult(res);
      toast('success', `Import complete! Created ${res.created} accounts.`);
    },
    onError: () => toast('error', 'Import failed'),
  });

  // Handlers — mutate live API database directly with fallback for demo mode
  const handleCreateSubject = () => {
    if (!subjectForm.name || !subjectForm.code) {
      toast('error', 'Subject name and course code are required');
      return;
    }
    if (isDemoMode) {
      const newSub: Subject = {
        id: `sub-${Date.now()}`,
        name: subjectForm.name,
        code: subjectForm.code,
        branch: subjectForm.branch,
        year: subjectForm.year,
        credits: subjectForm.credits,
        teachers: [],
      };
      setDemoSubjects(prev => [newSub, ...prev]);
      toast('success', 'Subject created!');
      setShowAddSubject(false);
      setSubjectForm({ name: '', code: '', branch: 'CSE', year: 3, credits: 4 });
      return;
    }
    createSubjectMutation.mutate(subjectForm);
  };

  const handleAssignTeacher = () => {
    if (!selectedSubjectForAssign) {
      toast('error', 'Please select a subject');
      return;
    }
    if (!selectedTeacherId) {
      toast('error', 'Please select a teacher');
      return;
    }

    if (isDemoMode) {
      const foundTeacher = teachers.find(t => t.id === selectedTeacherId);
      const teacherName = foundTeacher?.full_name || 'Teacher';
      const teacherEmail = foundTeacher?.email || '';

      setDemoSubjects(prev => prev.map(s => {
        if (s.id === selectedSubjectForAssign) {
          const existing = s.teachers || [];
          if (existing.some(t => t.teacherId === selectedTeacherId)) return s;
          return {
            ...s,
            teachers: [...existing, { assignmentId: `ts-${Date.now()}`, teacherId: selectedTeacherId, fullName: teacherName, email: teacherEmail }]
          };
        }
        return s;
      }));

      toast('success', 'Teacher assigned to subject!');
      setShowAssignModal(false);
      setSelectedSubjectForAssign('');
      setSelectedTeacherId('');
      return;
    }

    assignMutation.mutate({ subjectId: selectedSubjectForAssign, teacherUserId: selectedTeacherId });
  };

  const downloadSampleCSV = (role: 'student' | 'teacher' | 'parent') => {
    let content = '';
    let filename = '';

    if (role === 'student') {
      filename = 'sample_students.csv';
      content = `email,full_name,role,password,phone,branch,year,roll_number\nrahul.verma@demo.edu,Rahul Verma,student,Student@123,+919876543211,CSE,3,2024CSE001\nsneha.patel@demo.edu,Sneha Patel,student,Student@123,+919876543212,CSE,3,2024CSE002\n`;
    } else if (role === 'teacher') {
      filename = 'sample_teachers.csv';
      content = `email,full_name,role,password,phone,department,employee_id\npriya.sharma@demo.edu,Prof. Priya Sharma,teacher,Teacher@123,+919876543210,Computer Science,EMP1001\narjun.mehta@demo.edu,Prof. Arjun Mehta,teacher,Teacher@123,+919876543215,Mathematics,EMP1002\n`;
    } else {
      filename = 'sample_parents.csv';
      content = `email,full_name,role,password,phone,child_email\nparent.verma@demo.edu,Mr. Suresh Verma,parent,Parent@123,+919876543216,rahul.verma@demo.edu\n`;
    }

    const blob = new Blob([content], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="page-header mb-0">
          <h1 className="page-title flex items-center gap-2">
            <BookOpen className="w-6 h-6" style={{ color: 'var(--color-brand-primary)' }} />
            Academic Management & Assignments Hub
          </h1>
          <p className="page-subtitle">Assign teachers to subjects, enroll student classes, and bulk import users.</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary" onClick={() => setShowBulkEnrollModal(true)}>
            <Layers className="w-4 h-4" />
            Enroll Class
          </button>
          <button className="btn-primary" onClick={() => setShowAddSubject(true)}>
            <Plus className="w-4 h-4" />
            Add Subject
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b" style={{ borderColor: 'var(--border-default)' }}>
        {[
          { id: 'subjects', label: 'Subjects & Faculty', icon: <BookOpen className="w-4 h-4" /> },
          { id: 'enrollments', label: 'Class & Student Enrollments', icon: <GraduationCap className="w-4 h-4" /> },
          { id: 'csv-import', label: 'CSV Bulk Import & Templates', icon: <FileSpreadsheet className="w-4 h-4" /> },
        ].map(t => (
          <button
            key={t.id}
            className={`flex items-center gap-2 py-3 px-4 text-sm font-medium border-b-2 transition-all ${
              activeTab === t.id
                ? 'border-[var(--color-brand-primary)] text-[var(--color-brand-primary)]'
                : 'border-transparent hover:text-[var(--text-primary)]'
            }`}
            onClick={() => setActiveTab(t.id as AdminTab)}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* ====== TAB 1: SUBJECTS & FACULTY ASSIGNMENTS ====== */}
      {activeTab === 'subjects' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
              Curriculum Courses ({subjects.length})
            </p>
            <button className="btn-secondary text-xs" onClick={() => setShowAssignModal(true)}>
              <UserPlus className="w-3.5 h-3.5" />
              Assign Teacher to Subject
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {subjects.map(sub => (
              <div key={sub.id} className="card p-5 space-y-4 flex flex-col justify-between hover:shadow-md transition-all">
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <h3 className="font-semibold text-base" style={{ color: 'var(--text-primary)' }}>{sub.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="badge badge-brand font-semibold">{sub.code}</span>
                        {sub.branch && <span className="badge bg-[var(--bg-input)]">{sub.branch}</span>}
                        {sub.year && <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Year {sub.year}</span>}
                      </div>
                    </div>
                    <button
                      className="btn-secondary text-xs py-1.5 px-3 shrink-0 flex items-center gap-1"
                      onClick={() => { setSelectedSubjectForAssign(sub.id); setShowAssignModal(true); }}
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      Assign
                    </button>
                  </div>

                  <div className="mt-4 pt-3 border-t" style={{ borderColor: 'var(--border-default)' }}>
                    <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>
                      Assigned Faculty ({sub.teachers?.length ?? 0}):
                    </p>
                    {(sub.teachers?.length ?? 0) === 0 ? (
                      <p className="text-xs italic" style={{ color: 'var(--text-muted)' }}>No teacher assigned yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {sub.teachers?.map(t => (
                          <div key={t.assignmentId} className="flex items-center justify-between p-2.5 rounded-lg" style={{ background: 'var(--bg-input)' }}>
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xs font-bold">
                                {t.fullName.charAt(0)}
                              </div>
                              <div>
                                <p className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{t.fullName}</p>
                                <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{t.email}</p>
                              </div>
                            </div>
                            <button
                              className="btn-ghost p-1 text-red-500 hover:text-red-700"
                              title="Unassign Teacher"
                              disabled={unassignMutation.isPending}
                              onClick={() => {
                                if (isDemoMode) {
                                  setDemoSubjects(prev => prev.map(s => ({
                                    ...s,
                                    teachers: s.teachers?.filter(teacher => teacher.assignmentId !== t.assignmentId)
                                  })));
                                  toast('success', 'Teacher unassigned!');
                                } else {
                                  unassignMutation.mutate(t.assignmentId);
                                }
                              }}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ====== TAB 2: CLASS & STUDENT ENROLLMENTS ====== */}
      {activeTab === 'enrollments' && (
        <div className="card p-6 space-y-6">
          <div className="flex items-center justify-between border-b pb-4" style={{ borderColor: 'var(--border-default)' }}>
            <div>
              <h2 className="font-semibold text-lg" style={{ color: 'var(--text-primary)' }}>Bulk Class Enrollment</h2>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Enroll an entire branch & year cohort into a course in one click.</p>
            </div>
            <button className="btn-primary" onClick={() => setShowBulkEnrollModal(true)}>
              <Layers className="w-4 h-4" />
              Enroll Class
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {subjects.map(s => (
              <div key={s.id} className="p-4 rounded-xl border flex items-center justify-between" style={{ borderColor: 'var(--border-default)', background: 'var(--bg-card)' }}>
                <div>
                  <h4 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{s.name}</h4>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{s.code} • {s.branch || 'All Branches'} Year {s.year || 3}</p>
                </div>
                <button
                  className="btn-secondary text-xs"
                  onClick={() => {
                    setEnrollForm({ subjectId: s.id, branch: s.branch || 'CSE', year: s.year || 3 });
                    setShowBulkEnrollModal(true);
                  }}
                >
                  Enroll Class
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ====== TAB 3: CSV BULK IMPORT & TEMPLATES ====== */}
      {activeTab === 'csv-import' && (
        <div className="space-y-6">
          <div className="card p-6 space-y-6">
            <h2 className="font-semibold text-lg" style={{ color: 'var(--text-primary)' }}>Download Sample CSV Templates</h2>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Use these ready-to-use CSV templates to format student, teacher, and parent data for bulk import.</p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <button className="btn-secondary p-4 flex flex-col items-center gap-2" onClick={() => downloadSampleCSV('student')}>
                <Download className="w-5 h-5 text-violet-500" />
                <span className="text-sm font-semibold">Student CSV Template</span>
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Email, Full Name, Branch, Year, Roll Number</span>
              </button>
              <button className="btn-secondary p-4 flex flex-col items-center gap-2" onClick={() => downloadSampleCSV('teacher')}>
                <Download className="w-5 h-5 text-emerald-500" />
                <span className="text-sm font-semibold">Teacher CSV Template</span>
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Email, Full Name, Department, Employee ID</span>
              </button>
              <button className="btn-secondary p-4 flex flex-col items-center gap-2" onClick={() => downloadSampleCSV('parent')}>
                <Download className="w-5 h-5 text-sky-500" />
                <span className="text-sm font-semibold">Parent CSV Template</span>
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Email, Full Name, Phone, Child Email</span>
              </button>
            </div>
          </div>

          <div className="card p-6 space-y-4">
            <h2 className="font-semibold text-lg" style={{ color: 'var(--text-primary)' }}>Upload & Process CSV File</h2>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Upload your completed CSV file to create user accounts and profiles instantly.</p>

            <div className="flex gap-4 items-center">
              <input
                ref={fileRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) {
                    if (isDemoMode) {
                      toast('success', 'CSV processed! (Demo mode)');
                      setImportResult({ created: 4, skipped: 0, errors: [] });
                    } else {
                      importMutation.mutate(file);
                    }
                  }
                }}
              />
              <button
                className="btn-primary"
                disabled={importMutation.isPending}
                onClick={() => fileRef.current?.click()}
              >
                {importMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                Choose CSV File
              </button>
            </div>

            {importResult && (
              <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 space-y-2 animate-slide-up">
                <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" /> Import Complete!
                </p>
                <p className="text-xs text-emerald-600 dark:text-emerald-300">
                  Created {importResult.created} accounts. Skipped {importResult.skipped} duplicate rows.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create Subject Modal */}
      {showAddSubject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="card p-6 max-w-md w-full space-y-4 animate-slide-up shadow-xl">
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--border-default)' }}>
              <h3 className="font-semibold text-lg" style={{ color: 'var(--text-primary)' }}>Add New Subject</h3>
              <button className="btn-ghost p-1" onClick={() => setShowAddSubject(false)}>
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="label">Subject Name *</label>
              <input
                className="input"
                placeholder="e.g. Data Structures & Algorithms"
                value={subjectForm.name}
                onChange={e => setSubjectForm(p => ({ ...p, name: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Course Code *</label>
                <input
                  className="input"
                  placeholder="e.g. CS301"
                  value={subjectForm.code}
                  onChange={e => setSubjectForm(p => ({ ...p, code: e.target.value }))}
                />
              </div>
              <div>
                <label className="label">Branch</label>
                <input
                  className="input"
                  placeholder="e.g. CSE"
                  value={subjectForm.branch}
                  onChange={e => setSubjectForm(p => ({ ...p, branch: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Academic Year</label>
                <select
                  className="input"
                  value={subjectForm.year}
                  onChange={e => setSubjectForm(p => ({ ...p, year: Number(e.target.value) }))}
                >
                  <option value={1}>Year 1</option>
                  <option value={2}>Year 2</option>
                  <option value={3}>Year 3</option>
                  <option value={4}>Year 4</option>
                </select>
              </div>
              <div>
                <label className="label">Credits</label>
                <input
                  type="number"
                  className="input"
                  min={1}
                  max={6}
                  value={subjectForm.credits}
                  onChange={e => setSubjectForm(p => ({ ...p, credits: Number(e.target.value) }))}
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button className="btn-secondary flex-1" onClick={() => setShowAddSubject(false)}>Cancel</button>
              <button className="btn-primary flex-1" onClick={handleCreateSubject}>Save Subject</button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Teacher Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="card p-6 max-w-md w-full space-y-4 animate-slide-up shadow-xl">
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--border-default)' }}>
              <h3 className="font-semibold text-lg" style={{ color: 'var(--text-primary)' }}>Assign Faculty to Subject</h3>
              <button className="btn-ghost p-1" onClick={() => setShowAssignModal(false)}>
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="label">Select Subject *</label>
              <select className="input" value={selectedSubjectForAssign} onChange={e => setSelectedSubjectForAssign(e.target.value)}>
                <option value="">Choose subject...</option>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
              </select>
            </div>

            <div>
              <label className="label">Select Teacher *</label>
              <select className="input" value={selectedTeacherId} onChange={e => setSelectedTeacherId(e.target.value)}>
                <option value="">Choose faculty...</option>
                {teachers.map(t => <option key={t.id} value={t.id}>{t.full_name} ({t.email})</option>)}
              </select>
            </div>

            <div className="flex gap-3 pt-2">
              <button className="btn-secondary flex-1" onClick={() => setShowAssignModal(false)}>Cancel</button>
              <button
                className="btn-primary flex-1 flex items-center justify-center gap-2"
                disabled={assignMutation.isPending}
                onClick={handleAssignTeacher}
              >
                {assignMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Assigning...
                  </>
                ) : (
                  'Assign Faculty'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Enroll Modal */}
      {showBulkEnrollModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="card p-6 max-w-md w-full space-y-4 animate-slide-up shadow-xl">
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--border-default)' }}>
              <h3 className="font-semibold text-lg" style={{ color: 'var(--text-primary)' }}>Enroll Entire Class Cohort</h3>
              <button className="btn-ghost p-1" onClick={() => setShowBulkEnrollModal(false)}>
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="label">Subject *</label>
              <select className="input" value={enrollForm.subjectId} onChange={e => setEnrollForm(p => ({ ...p, subjectId: e.target.value }))}>
                <option value="">Choose subject...</option>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Branch</label>
                <input className="input" placeholder="e.g. CSE" value={enrollForm.branch} onChange={e => setEnrollForm(p => ({ ...p, branch: e.target.value }))} />
              </div>
              <div>
                <label className="label">Year</label>
                <select className="input" value={enrollForm.year} onChange={e => setEnrollForm(p => ({ ...p, year: Number(e.target.value) }))}>
                  <option value={1}>Year 1</option>
                  <option value={2}>Year 2</option>
                  <option value={3}>Year 3</option>
                  <option value={4}>Year 4</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button className="btn-secondary flex-1" onClick={() => setShowBulkEnrollModal(false)}>Cancel</button>
              <button
                className="btn-primary flex-1"
                onClick={() => {
                  if (isDemoMode) {
                    toast('success', 'Bulk enrolled class cohort! (Demo mode)');
                    setShowBulkEnrollModal(false);
                  } else {
                    bulkEnrollMutation.mutate(enrollForm);
                  }
                }}
              >
                Enroll Class
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
