import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { supabase } from '../db/supabase';
import { authenticate, authorize } from '../middleware/auth';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import { sendWhatsAppAlert } from '../services/notificationService';

export const attendanceRouter = Router();
attendanceRouter.use(authenticate);

const MarkAttendanceSchema = z.object({
  subjectId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  records: z.array(z.object({
    studentUserId: z.string().uuid(),
    status: z.enum(['present', 'absent', 'late', 'excused']),
    note: z.string().optional(),
  })).min(1),
});

const UpdateRecordSchema = z.object({
  status: z.enum(['present', 'absent', 'late', 'excused']),
  note: z.string().optional(),
});

// GET /api/attendance/subjects — get subjects for attendance marking
attendanceRouter.get('/subjects', authorize('teacher', 'admin'), asyncHandler(async (req: Request, res: Response) => {
  const user = req.user!;

  if (user.role === 'admin') {
    const { data } = await supabase
      .from('subjects')
      .select('*')
      .eq('institution_id', user.institutionId)
      .order('name', { ascending: true });
    res.json({ data: data ?? [] });
    return;
  }

  // Teacher: check teacher_subjects first
  const { data: teacherSubs } = await supabase
    .from('teacher_subjects')
    .select('subject_id, subjects(*)')
    .eq('teacher_user_id', user.userId)
    .eq('institution_id', user.institutionId);

  let subjects = (teacherSubs ?? []).map((ts: Record<string, unknown>) => ts.subjects).filter(Boolean);

  // Fallback to all institution subjects if no specific teacher assignment exists
  if (subjects.length === 0) {
    const { data: allSubs } = await supabase
      .from('subjects')
      .select('*')
      .eq('institution_id', user.institutionId)
      .order('name', { ascending: true });

    subjects = allSubs ?? [];
  }

  res.json({ data: subjects });
}));

// POST /api/attendance
attendanceRouter.post('/', authorize('teacher', 'admin'), asyncHandler(async (req: Request, res: Response) => {
  const body = MarkAttendanceSchema.parse(req.body);
  const user = req.user!;

  const { data: teaches } = await supabase
    .from('teacher_subjects')
    .select('id')
    .eq('teacher_user_id', user.userId)
    .eq('subject_id', body.subjectId);

  if (!teaches || teaches.length === 0) {
    try {
      await supabase.from('teacher_subjects').upsert({
        teacher_user_id: user.userId,
        subject_id: body.subjectId,
        institution_id: user.institutionId,
        academic_year: '2024-25',
      }, { onConflict: 'teacher_user_id,subject_id,academic_year' });
    } catch {}
  }

  const inserted = [];
  for (const record of body.records) {
    const { data, error } = await supabase
      .from('attendance_records')
      .upsert({
        institution_id: user.institutionId,
        subject_id: body.subjectId,
        student_user_id: record.studentUserId,
        teacher_user_id: user.userId,
        date: body.date,
        status: record.status,
        note: record.note ?? null,
      }, { onConflict: 'subject_id,student_user_id,date' })
      .select()
      .single();

    if (!error && data) inserted.push(data);
  }

  await checkAttendanceRiskAndAlert(body.subjectId, user.institutionId);
  res.status(201).json({ data: inserted });
}));

async function getParentChildIds(parentUserId: string): Promise<string[]> {
  const { data } = await supabase
    .from('parent_student_links')
    .select('student_user_id')
    .eq('parent_user_id', parentUserId);

  return (data ?? []).map(d => d.student_user_id).filter(Boolean);
}

// GET /api/attendance
attendanceRouter.get('/', asyncHandler(async (req: Request, res: Response) => {
  const user = req.user!;
  const { subjectId, studentId, from, to } = req.query;

  let q = supabase
    .from('attendance_records')
    .select('*, subjects(name, code), users!attendance_records_student_user_id_fkey(full_name)')
    .eq('institution_id', user.institutionId)
    .order('created_at', { ascending: false });

  if (user.role === 'student') {
    q = q.eq('student_user_id', user.userId);
  } else if (user.role === 'parent') {
    const childIds = await getParentChildIds(user.userId);
    if (childIds.length === 0) {
      res.json({ data: [] });
      return;
    }
    if (studentId) {
      if (!childIds.includes(studentId as string)) {
        res.json({ data: [] });
        return;
      }
      q = q.eq('student_user_id', studentId as string);
    } else {
      q = q.in('student_user_id', childIds);
    }
  } else if (studentId) {
    q = q.eq('student_user_id', studentId as string);
  }

  if (subjectId) q = q.eq('subject_id', subjectId as string);
  if (from) q = q.gte('date', from as string);
  if (to) q = q.lte('date', to as string);

  const { data, error } = await q;
  if (error) throw new AppError(500, error.message);

  const rows = (data ?? []).map((ar: Record<string, unknown>) => ({
    ...ar,
    subject_name: (ar.subjects as Record<string, string> | null)?.name,
    subject_code: (ar.subjects as Record<string, string> | null)?.code,
    student_name: (ar.users as Record<string, string> | null)?.full_name,
    subjects: undefined,
    users: undefined,
  }));

  res.json({ data: rows });
}));

// GET /api/attendance/summary
attendanceRouter.get('/summary', asyncHandler(async (req: Request, res: Response) => {
  const user = req.user!;
  const { studentId } = req.query;

  let targetStudentIds: string[] = [user.userId];
  if (user.role === 'teacher' || user.role === 'admin') {
    if (!studentId) throw new AppError(400, 'studentId required for teacher/admin');
    targetStudentIds = [studentId as string];
  } else if (user.role === 'parent') {
    const childIds = await getParentChildIds(user.userId);
    if (childIds.length === 0) {
      res.json({ data: [] });
      return;
    }
    if (studentId && childIds.includes(studentId as string)) {
      targetStudentIds = [studentId as string];
    } else {
      targetStudentIds = childIds;
    }
  }

  const { data: records, error } = await supabase
    .from('attendance_records')
    .select('status, subject_id, subjects(name, code)')
    .in('student_user_id', targetStudentIds)
    .eq('institution_id', user.institutionId);

  if (error) throw new AppError(500, error.message);

  const summaryMap: Record<string, { subject_id: string; subject_name: string; code: string; attended: number; total: number }> = {};

  for (const r of (records ?? []) as Array<Record<string, unknown>>) {
    const subId = r.subject_id as string;
    const subInfo = r.subjects as { name: string; code: string } | null;
    if (!summaryMap[subId]) {
      summaryMap[subId] = {
        subject_id: subId,
        subject_name: subInfo?.name ?? 'Subject',
        code: subInfo?.code ?? '',
        attended: 0,
        total: 0,
      };
    }
    summaryMap[subId].total += 1;
    if (r.status === 'present' || r.status === 'late') {
      summaryMap[subId].attended += 1;
    }
  }

  const summary = Object.values(summaryMap).map(s => ({
    ...s,
    percentage: s.total > 0 ? Math.round((s.attended / s.total) * 10000) / 100 : 0,
  }));

  res.json({ data: summary });
}));

// GET /api/attendance/overview — teacher & admin
attendanceRouter.get('/overview', authorize('teacher', 'admin'), asyncHandler(async (req: Request, res: Response) => {
  const user = req.user!;

  const { data: records, error } = await supabase
    .from('attendance_records')
    .select('status, student_user_id, subject_id, users!attendance_records_student_user_id_fkey(full_name), subjects(name, code)')
    .eq('institution_id', user.institutionId);

  if (error) throw new AppError(500, error.message);

  const map: Record<string, { student_user_id: string; student_name: string; subject_name: string; subject_code: string; attended: number; total: number }> = {};

  for (const r of (records ?? []) as Array<Record<string, unknown>>) {
    const key = `${r.student_user_id}_${r.subject_id}`;
    const userInfo = r.users as { full_name: string } | null;
    const subInfo = r.subjects as { name: string; code: string } | null;

    if (!map[key]) {
      map[key] = {
        student_user_id: r.student_user_id as string,
        student_name: userInfo?.full_name ?? 'Student',
        subject_name: subInfo?.name ?? 'Subject',
        subject_code: subInfo?.code ?? '',
        attended: 0,
        total: 0,
      };
    }
    map[key].total += 1;
    if (r.status === 'present' || r.status === 'late') {
      map[key].attended += 1;
    }
  }

  const overview = Object.values(map).map(item => ({
    ...item,
    percentage: item.total > 0 ? Math.round((item.attended / item.total) * 10000) / 100 : 0,
  }));

  res.json({ data: overview });
}));

// PATCH /api/attendance/:id
attendanceRouter.patch('/:id', authorize('teacher'), asyncHandler(async (req: Request, res: Response) => {
  const body = UpdateRecordSchema.parse(req.body);
  const user = req.user!;

  const { data, error } = await supabase
    .from('attendance_records')
    .update({ status: body.status, note: body.note ?? null })
    .eq('id', req.params.id)
    .eq('institution_id', user.institutionId)
    .select()
    .single();

  if (error) throw new AppError(500, error.message);
  res.json(data);
}));

async function checkAttendanceRiskAndAlert(subjectId: string, institutionId: string): Promise<void> {
  // Optional WhatsApp alert logic can use supabase queries
}
