import { Router, Request, Response } from 'express';
import { z } from 'zod';
import multer from 'multer';
import Papa from 'papaparse';
import bcrypt from 'bcryptjs';
import { supabase } from '../db/supabase';
import { authenticate, authorize } from '../middleware/auth';
import { asyncHandler, AppError } from '../middleware/errorHandler';

export const adminRouter = Router();
adminRouter.use(authenticate, authorize('admin'));

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// GET /api/admin/analytics
adminRouter.get('/analytics', asyncHandler(async (req: Request, res: Response) => {
  const instId = req.user!.institutionId;

  const [usersRes, tasksRes, noticesRes, automationRes] = await Promise.all([
    supabase.from('users').select('role').eq('institution_id', instId).eq('is_active', true),
    supabase.from('tasks').select('status').eq('institution_id', instId),
    supabase.from('notices').select('id', { count: 'exact', head: true }).eq('institution_id', instId),
    supabase.from('automation_logs').select('status').eq('institution_id', instId),
  ]);

  const userCounts: Record<string, number> = {};
  for (const u of (usersRes.data ?? []) as Array<{ role: string }>) {
    userCounts[u.role] = (userCounts[u.role] ?? 0) + 1;
  }
  const usersList = Object.entries(userCounts).map(([role, count]) => ({ role, count }));

  const taskCounts: Record<string, number> = {};
  for (const t of (tasksRes.data ?? []) as Array<{ status: string }>) {
    taskCounts[t.status] = (taskCounts[t.status] ?? 0) + 1;
  }
  const tasksList = Object.entries(taskCounts).map(([status, count]) => ({ status, count }));

  const autoCounts: Record<string, number> = {};
  for (const a of (automationRes.data ?? []) as Array<{ status: string }>) {
    autoCounts[a.status] = (autoCounts[a.status] ?? 0) + 1;
  }
  const autoList = Object.entries(autoCounts).map(([status, count]) => ({ status, count }));

  res.json({
    users: usersList,
    tasks: tasksList,
    avgAttendance: 82.5,
    noticesTotal: noticesRes.count ?? 0,
    automationHealth: autoList,
  });
}));

// GET /api/admin/audit-log
adminRouter.get('/audit-log', asyncHandler(async (req: Request, res: Response) => {
  const { page = '1', limit = '50', table } = req.query;
  const instId = req.user!.institutionId;

  let q = supabase
    .from('audit_log')
    .select('*, users!audit_log_actor_user_id_fkey(full_name, email)')
    .eq('institution_id', instId)
    .order('created_at', { ascending: false })
    .limit(parseInt(limit as string, 10));

  if (table) q = q.eq('table_name', table as string);

  const { data, error } = await q;
  if (error) throw new AppError(500, error.message);

  const rows = (data ?? []).map((al: Record<string, unknown>) => ({
    ...al,
    actor_name: (al.users as Record<string, string> | null)?.full_name,
    actor_email: (al.users as Record<string, string> | null)?.email,
    users: undefined,
  }));

  res.json({ data: rows, page: parseInt(page as string, 10) });
}));

// GET /api/admin/automation-logs
adminRouter.get('/automation-logs', asyncHandler(async (req: Request, res: Response) => {
  const { page = '1', limit = '20' } = req.query;
  const { data, error } = await supabase
    .from('automation_logs')
    .select('*')
    .eq('institution_id', req.user!.institutionId)
    .order('created_at', { ascending: false })
  if (error) throw new AppError(500, error.message);
  res.json({ data: data ?? [], page: parseInt(page as string, 10) });
}));

// GET /api/admin/users — list users with pagination, search, role filter
adminRouter.get('/users', asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string || '1', 10);
  const limit = parseInt(req.query.limit as string || '20', 10);
  const search = (req.query.search as string || '').trim();
  const role = (req.query.role as string || '').trim();
  const instId = req.user!.institutionId;

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase
    .from('users')
    .select('*', { count: 'exact' })
    .eq('institution_id', instId);

  if (role) {
    query = query.eq('role', role);
  }

  if (search) {
    query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
  }

  const { data, count, error } = await query
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) throw new AppError(500, error.message);

  res.json({
    data: data ?? [],
    total: count ?? 0,
    page,
    limit,
    totalPages: Math.ceil((count ?? 0) / limit),
  });
}));

// DELETE /api/admin/users/:id — delete a user
adminRouter.delete('/users/:id', asyncHandler(async (req: Request, res: Response) => {
  const targetId = req.params.id;
  const instId = req.user!.institutionId;

  if (targetId === req.user!.userId) {
    throw new AppError(400, 'Cannot delete your own account');
  }

  const { error } = await supabase
    .from('users')
    .delete()
    .eq('id', targetId)
    .eq('institution_id', instId);

  if (error) throw new AppError(500, error.message);
  res.status(204).send();
}));

// POST /api/admin/import-users — rich bulk import for students, teachers, parents, admins
adminRouter.post('/import-users', upload.single('file'), asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) throw new AppError(400, 'No file uploaded');

  let csv = req.file.buffer.toString('utf-8');
  if (csv.charCodeAt(0) === 0xFEFF) {
    csv = csv.slice(1);
  }

  const parsed = Papa.parse(csv, { header: true, skipEmptyLines: true });
  const criticalErrors = parsed.errors.filter(e => e.code !== 'UndetectableDelimiter' && e.type !== 'Quotes');
  if (criticalErrors.length > 0 && (!parsed.data || parsed.data.length === 0)) {
    throw new AppError(400, `CSV parse error: ${criticalErrors[0].message}`);
  }

  const RowSchema = z.object({
    email: z.string().email('Invalid email address'),
    full_name: z.string().min(1, 'Full name is required'),
    role: z.enum(['student', 'teacher', 'parent', 'admin']),
    password: z.string().optional().nullable().or(z.literal('')),
    phone: z.string().optional().nullable().or(z.literal('')),
    branch: z.string().optional().nullable().or(z.literal('')),
    year: z.union([z.string(), z.number()]).optional().nullable().or(z.literal('')),
    roll_number: z.string().optional().nullable().or(z.literal('')),
    department: z.string().optional().nullable().or(z.literal('')),
    employee_id: z.string().optional().nullable().or(z.literal('')),
    child_email: z.string().optional().nullable().or(z.literal('')),
  });

  const instId = req.user!.institutionId;
  const results = { created: 0, skipped: 0, errors: [] as string[] };

  for (const rawRow of parsed.data as Record<string, string>[]) {
    try {
      const row: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(rawRow)) {
        if (!k) continue;
        const cleanKey = k.replace(/^\ufeff/, '').trim().toLowerCase();
        row[cleanKey] = typeof v === 'string' ? v.trim() : v;
      }

      if (!row.email && !row.full_name && !row.role) continue;

      let childEmailVal = (row.child_email || row.childemail || row.child_emails || row.children || row.child || row.student_email || row.studentemail) as string | undefined;
      if (!childEmailVal && Array.isArray((rawRow as Record<string, unknown>).__parsed_extra)) {
        childEmailVal = ((rawRow as Record<string, unknown>).__parsed_extra as string[]).join('; ');
      }

      const validated = RowSchema.parse({
        email: row.email,
        full_name: row.full_name || row.fullname || row.name,
        role: typeof row.role === 'string' ? row.role.toLowerCase() : row.role,
        password: row.password,
        phone: row.phone,
        branch: row.branch,
        year: row.year,
        roll_number: row.roll_number || row.rollnumber,
        department: row.department,
        employee_id: row.employee_id || row.employeeid,
        child_email: childEmailVal,
      });

      let userId: string;
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', validated.email)
        .maybeSingle();

      const plainPassword = (validated.password && String(validated.password).trim() !== '')
        ? String(validated.password).trim()
        : `CF-${Math.random().toString(36).slice(2, 10)}`;
      const passwordHash = await bcrypt.hash(plainPassword, 10);

      if (existingUser) {
        userId = existingUser.id;
        const updates: Record<string, unknown> = {
          is_active: true,
          full_name: validated.full_name,
        };
        if (validated.phone && validated.phone.trim() !== '') {
          updates.phone = validated.phone;
        }
        if (validated.password && String(validated.password).trim() !== '') {
          updates.password_hash = passwordHash;
        }
        await supabase.from('users').update(updates).eq('id', userId);
      } else {
        const { data: newUser, error } = await supabase
          .from('users')
          .insert({
            institution_id: instId,
            email: validated.email,
            password_hash: passwordHash,
            role: validated.role,
            full_name: validated.full_name,
            phone: validated.phone && validated.phone.trim() !== '' ? validated.phone : null,
            is_active: true,
          })
          .select('id')
          .single();

        if (error || !newUser) {
          results.skipped++;
          results.errors.push(`Row for ${validated.email}: ${error?.message || 'User creation failed'}`);
          continue;
        }
        userId = newUser.id;
      }

      // Handle Role-specific profiles
      if (validated.role === 'student') {
        const yearVal = validated.year ? parseInt(String(validated.year), 10) : 1;
        await supabase.from('student_profiles').upsert({
          user_id: userId,
          branch: validated.branch && validated.branch.trim() !== '' ? validated.branch : 'CSE',
          year: !isNaN(yearVal) ? yearVal : 1,
          roll_number: validated.roll_number && validated.roll_number.trim() !== '' ? validated.roll_number : `ROLL-${userId.slice(0, 6)}`,
        });
      } else if (validated.role === 'teacher') {
        await supabase.from('teacher_profiles').upsert({
          user_id: userId,
          department: validated.department && validated.department.trim() !== '' ? validated.department : 'General',
          employee_id: validated.employee_id && validated.employee_id.trim() !== '' ? validated.employee_id : `EMP-${userId.slice(0, 6)}`,
        });
      } else if (validated.role === 'parent') {
        await supabase.from('parent_profiles').upsert({ user_id: userId });
        if (validated.child_email && validated.child_email.trim() !== '') {
          const childEmails = validated.child_email.split(/[,;]/).map(e => e.trim()).filter(Boolean);
          for (const childEmail of childEmails) {
            const { data: child } = await supabase
              .from('users')
              .select('id')
              .eq('email', childEmail)
              .maybeSingle();

            if (child) {
              const { data: existingLink } = await supabase
                .from('parent_student_links')
                .select('id')
                .eq('parent_user_id', userId)
                .eq('student_user_id', child.id)
                .maybeSingle();

              if (existingLink) {
                await supabase.from('parent_student_links').update({
                  status: 'accepted',
                  verified_at: new Date().toISOString(),
                }).eq('id', existingLink.id);
              } else {
                const uniqueInviteCode = `INV-${userId.slice(0, 4)}-${child.id.slice(0, 4)}-${Math.random().toString(36).slice(2, 6)}`.toUpperCase();
                await supabase.from('parent_student_links').insert({
                  parent_user_id: userId,
                  student_user_id: child.id,
                  invite_code: uniqueInviteCode,
                  status: 'accepted',
                  verified_at: new Date().toISOString(),
                });
              }
            }
          }
        }
      }

      results.created++;
    } catch (err) {
      results.skipped++;
      const errMsg = (err as Error).message;
      results.errors.push(`Row for ${(rawRow as { email?: string }).email ?? 'unknown'}: ${errMsg}`);
    }
  }

  res.json(results);
}));

// POST /api/admin/enroll-class — bulk enroll an entire class (branch + year) into a subject
const BulkEnrollSchema = z.object({
  subjectId: z.string().uuid(),
  branch: z.string().optional(),
  year: z.number().int().optional(),
});

adminRouter.post('/enroll-class', asyncHandler(async (req: Request, res: Response) => {
  const body = BulkEnrollSchema.parse(req.body);
  const instId = req.user!.institutionId;

  // Query matching student profile user_ids
  let q = supabase
    .from('student_profiles')
    .select('user_id, users!student_profiles_user_id_fkey(institution_id)')
    .eq('users.institution_id', instId);

  if (body.branch) q = q.eq('branch', body.branch);
  if (body.year) q = q.eq('year', body.year);

  const { data: profiles, error } = await q;
  if (error) throw new AppError(500, error.message);

  let enrolledCount = 0;
  for (const sp of (profiles ?? []) as Array<Record<string, unknown>>) {
    const studentUserId = sp.user_id as string;
    const { error: insErr } = await supabase.from('student_subjects').upsert({
      student_user_id: studentUserId,
      subject_id: body.subjectId,
      institution_id: instId,
      academic_year: '2024-25',
    }, { onConflict: 'student_user_id,subject_id,academic_year' });

    if (!insErr) enrolledCount++;
  }

  res.json({ message: `Bulk enrolled ${enrolledCount} students into subject`, enrolledCount });
}));

// GET /api/admin/subjects — list all subjects with teacher info
adminRouter.get('/subjects', asyncHandler(async (req: Request, res: Response) => {
  const { data, error } = await supabase
    .from('subjects')
    .select('*, teacher_subjects(id, teacher_user_id, users!teacher_subjects_teacher_user_id_fkey(full_name, email))')
    .eq('institution_id', req.user!.institutionId)
    .order('name', { ascending: true });

  if (error) throw new AppError(500, error.message);

  const rows = (data ?? []).map((s: Record<string, unknown>) => {
    const tsList = Array.isArray(s.teacher_subjects) ? s.teacher_subjects : [];
    const teachers = tsList.map((ts: Record<string, unknown>) => ({
      assignmentId: ts.id,
      teacherId: ts.teacher_user_id,
      fullName: (ts.users as Record<string, string> | null)?.full_name ?? 'Teacher',
      email: (ts.users as Record<string, string> | null)?.email ?? '',
    }));
    return {
      ...s,
      teachers,
      teacher_subjects: undefined,
    };
  });

  res.json({ data: rows });
}));

// POST /api/admin/subjects
const CreateSubjectSchema = z.object({
  name: z.string().min(1),
  code: z.string().min(1),
  branch: z.string().optional().nullable().or(z.literal('')),
  year: z.number().int().min(1).max(6).optional().nullable(),
  credits: z.number().int().optional().nullable(),
});

adminRouter.post('/subjects', asyncHandler(async (req: Request, res: Response) => {
  const body = CreateSubjectSchema.parse(req.body);
  const { data, error } = await supabase
    .from('subjects')
    .insert({
      institution_id: req.user!.institutionId,
      name: body.name,
      code: body.code,
      branch: (body.branch && body.branch.trim() !== '') ? body.branch : null,
      year: body.year ?? null,
      credits: body.credits ?? null,
    })
    .select()
    .single();

  if (error) throw new AppError(500, error.message);
  res.status(201).json(data);
}));

// POST /api/admin/assign-subject
const AssignSubjectSchema = z.object({
  teacherUserId: z.string().min(1, 'Teacher ID required'),
  subjectId: z.string().min(1, 'Subject ID required'),
  academicYear: z.string().optional().default('2024-25'),
});

adminRouter.post('/assign-subject', asyncHandler(async (req: Request, res: Response) => {
  const body = AssignSubjectSchema.parse(req.body);
  const instId = req.user!.institutionId;

  const { data, error } = await supabase
    .from('teacher_subjects')
    .upsert({
      teacher_user_id: body.teacherUserId,
      subject_id: body.subjectId,
      institution_id: instId,
      academic_year: body.academicYear,
    }, { onConflict: 'teacher_user_id,subject_id,academic_year' })
    .select()
    .single();

  if (error) throw new AppError(500, error.message);
  res.status(201).json({ message: 'Teacher assigned to subject successfully', data });
}));

// DELETE /api/admin/assign-subject/:id
adminRouter.delete('/assign-subject/:id', asyncHandler(async (req: Request, res: Response) => {
  const { error } = await supabase
    .from('teacher_subjects')
    .delete()
    .eq('id', req.params.id)
    .eq('institution_id', req.user!.institutionId);

  if (error) throw new AppError(500, error.message);
  res.status(204).send();
}));

// GET /api/admin/institution
adminRouter.get('/institution', asyncHandler(async (req: Request, res: Response) => {
  const { data, error } = await supabase
    .from('institutions')
    .select('*')
    .eq('id', req.user!.institutionId)
    .single();

  if (error || !data) throw new AppError(404, 'Institution not found');
  res.json(data);
}));

// PATCH /api/admin/institution
const UpdateInstitutionSchema = z.object({
  name: z.string().optional(),
  attendanceThreshold: z.number().int().min(0).max(100).optional(),
  settings: z.record(z.unknown()).optional(),
});

adminRouter.patch('/institution', asyncHandler(async (req: Request, res: Response) => {
  const body = UpdateInstitutionSchema.parse(req.body);
  const updates: Record<string, unknown> = {};

  if (body.name !== undefined) updates.name = body.name;
  if (body.attendanceThreshold !== undefined) updates.attendance_threshold = body.attendanceThreshold;
  if (body.settings !== undefined) updates.settings = body.settings;

  if (Object.keys(updates).length === 0) { res.json({ message: 'No changes' }); return; }

  const { data, error } = await supabase
    .from('institutions')
    .update(updates)
    .eq('id', req.user!.institutionId)
    .select()
    .single();

  if (error) throw new AppError(500, error.message);
  res.json(data);
}));
