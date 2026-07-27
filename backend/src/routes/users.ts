import { Router, Request, Response } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import { supabase } from '../db/supabase';
import { authenticate, authorize } from '../middleware/auth';
import { asyncHandler, AppError } from '../middleware/errorHandler';

export const usersRouter = Router();
usersRouter.use(authenticate);

const UpdateProfileSchema = z.object({
  fullName: z.string().min(1).max(200).optional(),
  phone: z.string().optional(),
  avatarUrl: z.string().url().optional(),
  themePreference: z.enum(['light', 'dark', 'system']).optional(),
  isActive: z.boolean().optional(),
  is_active: z.boolean().optional(),
  notificationPrefs: z.object({
    in_app: z.boolean().optional(),
    whatsapp: z.boolean().optional(),
    email: z.boolean().optional(),
  }).optional(),
});

const OnboardingStudentSchema = z.object({
  branch: z.string().min(1),
  year: z.number().int().min(1).max(6),
  rollNumber: z.string().optional(),
  subjectIds: z.array(z.string().uuid()),
  academicYear: z.string(),
});

const OnboardingTeacherSchema = z.object({
  department: z.string().min(1),
  employeeId: z.string().optional(),
  subjectIds: z.array(z.string().uuid()),
  academicYear: z.string(),
});

const OnboardingParentSchema = z.object({
  inviteCode: z.string().min(1),
});

const InviteParentSchema = z.object({
  parentEmail: z.string().email(),
});

// GET /api/users/profile
usersRouter.get('/profile', asyncHandler(async (req: Request, res: Response) => {
  const { data: user, error } = await supabase
    .from('users')
    .select('*, student_profiles(branch, year, roll_number), teacher_profiles(department, employee_id)')
    .eq('id', req.user!.userId)
    .single();

  if (error || !user) throw new AppError(404, 'User not found');

  const sp = Array.isArray(user.student_profiles) ? user.student_profiles[0] : user.student_profiles;
  const tp = Array.isArray(user.teacher_profiles) ? user.teacher_profiles[0] : user.teacher_profiles;

  res.json({
    ...user,
    branch: sp?.branch,
    year: sp?.year,
    roll_number: sp?.roll_number,
    department: tp?.department,
    employee_id: tp?.employee_id,
    student_profiles: undefined,
    teacher_profiles: undefined,
  });
}));

// PATCH /api/users/profile or /api/users/:id
const handleUpdateProfile = asyncHandler(async (req: Request, res: Response) => {
  const body = UpdateProfileSchema.parse(req.body);
  const updates: Record<string, unknown> = {};

  const targetUserId = (req.params.id && req.params.id !== 'profile') ? req.params.id : req.user!.userId;

  if (targetUserId !== req.user!.userId && req.user!.role !== 'admin') {
    throw new AppError(403, 'Forbidden');
  }

  if (body.fullName !== undefined) updates.full_name = body.fullName;
  if (body.phone !== undefined) updates.phone = body.phone;
  if (body.avatarUrl !== undefined && body.avatarUrl !== '') updates.avatar_url = body.avatarUrl;
  if (body.themePreference !== undefined) updates.theme_preference = body.themePreference;
  if (body.isActive !== undefined) updates.is_active = body.isActive;
  if (body.is_active !== undefined) updates.is_active = body.is_active;
  if (body.notificationPrefs !== undefined) updates.notification_prefs = body.notificationPrefs;

  if (Object.keys(updates).length === 0) { res.json({ message: 'No changes' }); return; }

  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', targetUserId)
    .select('id, email, full_name, role, phone, avatar_url, theme_preference, notification_prefs')
    .single();

  if (error) throw new AppError(500, error.message);
  res.json(data);
});

usersRouter.patch('/profile', handleUpdateProfile);
usersRouter.patch('/:id', handleUpdateProfile);

// POST /api/users/onboarding/student
usersRouter.post('/onboarding/student', authorize('student'), asyncHandler(async (req: Request, res: Response) => {
  const body = OnboardingStudentSchema.parse(req.body);
  const userId = req.user!.userId;
  const institutionId = req.user!.institutionId;

  await supabase.from('student_profiles').upsert({
    user_id: userId,
    branch: body.branch,
    year: body.year,
    roll_number: body.rollNumber ?? null,
  });

  for (const subjectId of body.subjectIds) {
    await supabase.from('student_subjects').upsert({
      student_user_id: userId,
      subject_id: subjectId,
      institution_id: institutionId,
      academic_year: body.academicYear,
    });
  }

  res.json({ message: 'Student onboarding complete' });
}));

// POST /api/users/onboarding/teacher
usersRouter.post('/onboarding/teacher', authorize('teacher'), asyncHandler(async (req: Request, res: Response) => {
  const body = OnboardingTeacherSchema.parse(req.body);
  const userId = req.user!.userId;
  const institutionId = req.user!.institutionId;

  await supabase.from('teacher_profiles').upsert({
    user_id: userId,
    department: body.department,
    employee_id: body.employeeId ?? null,
  });

  for (const subjectId of body.subjectIds) {
    await supabase.from('teacher_subjects').upsert({
      teacher_user_id: userId,
      subject_id: subjectId,
      institution_id: institutionId,
      academic_year: body.academicYear,
    });
  }

  res.json({ message: 'Teacher onboarding complete' });
}));

// POST /api/users/onboarding/parent
usersRouter.post('/onboarding/parent', authorize('parent'), asyncHandler(async (req: Request, res: Response) => {
  const { inviteCode } = OnboardingParentSchema.parse(req.body);
  const parentUserId = req.user!.userId;

  const { data: links } = await supabase
    .from('parent_student_links')
    .select('id, student_user_id, status, expires_at')
    .eq('invite_code', inviteCode)
    .limit(1);

  if (!links || links.length === 0) throw new AppError(404, 'Invalid invite code');
  const link = links[0];
  if (link.status !== 'pending') throw new AppError(409, 'Invite code already used or revoked');
  if (new Date(link.expires_at) < new Date()) throw new AppError(410, 'Invite code has expired');

  await supabase
    .from('parent_student_links')
    .update({ parent_user_id: parentUserId, status: 'accepted', verified_at: new Date().toISOString() })
    .eq('id', link.id);

  await supabase.from('parent_profiles').upsert({ user_id: parentUserId });

  res.json({ message: 'Parent linked to student successfully', studentUserId: link.student_user_id });
}));

// POST /api/users/invite-parent
usersRouter.post('/invite-parent', authorize('student'), asyncHandler(async (req: Request, res: Response) => {
  const { parentEmail } = InviteParentSchema.parse(req.body);
  const studentUserId = req.user!.userId;
  const institutionId = req.user!.institutionId;

  const inviteCode = crypto.randomUUID().replace(/-/g, '').slice(0, 12).toUpperCase();

  const { data: parents } = await supabase
    .from('users')
    .select('id')
    .eq('email', parentEmail)
    .eq('institution_id', institutionId)
    .eq('role', 'parent')
    .limit(1);

  const parentId = parents?.[0]?.id ?? null;

  await supabase.from('parent_student_links').insert({
    parent_user_id: parentId,
    student_user_id: studentUserId,
    invite_code: inviteCode,
  });

  res.json({ inviteCode, expiresIn: '7 days', parentEmail });
}));

// GET /api/users/children — get linked children for parent
usersRouter.get('/children', authorize('parent'), asyncHandler(async (req: Request, res: Response) => {
  const parentUserId = req.user!.userId;
  const { data: links, error } = await supabase
    .from('parent_student_links')
    .select('student_user_id, users!parent_student_links_student_user_id_fkey(id, full_name, email, phone, student_profiles(branch, year, roll_number))')
    .eq('parent_user_id', parentUserId);

  if (error) throw new AppError(500, error.message);

  const children = (links ?? []).map(l => {
    const u = (l.users as unknown) as Record<string, unknown> | null;
    const sp = Array.isArray(u?.student_profiles) ? u?.student_profiles[0] : u?.student_profiles;
    return {
      id: u?.id,
      full_name: u?.full_name,
      email: u?.email,
      phone: u?.phone,
      branch: (sp as Record<string, unknown>)?.branch ?? 'CSE',
      year: (sp as Record<string, unknown>)?.year ?? 1,
      roll_number: (sp as Record<string, unknown>)?.roll_number ?? '',
    };
  }).filter(c => Boolean(c.id));

  res.json({ data: children });
}));

// GET /api/users
usersRouter.get('/', asyncHandler(async (req: Request, res: Response) => {
  const user = req.user!;
  const { role, page = '1', limit = '20', search = '' } = req.query;

  if (user.role !== 'admin' && user.role !== 'teacher') {
    throw new AppError(403, 'Access denied');
  }
  const effectiveRole = (role as string | undefined) || (user.role === 'teacher' ? 'student' : undefined);

  let q = supabase
    .from('users')
    .select('id, email, full_name, role, phone, is_active, created_at', { count: 'exact' })
    .eq('institution_id', user.institutionId)
    .eq('is_active', true)
    .order('full_name', { ascending: true })
    .limit(parseInt(limit as string, 10));

  if (effectiveRole) q = q.eq('role', effectiveRole);
  if (search) q = q.ilike('full_name', `%${search}%`);

  const { data, count, error } = await q;
  if (error) throw new AppError(500, error.message);

  res.json({ data: data ?? [], total: count ?? 0, page: parseInt(page as string, 10) });
}));

// PATCH /api/users/:id
usersRouter.patch('/:id', authorize('admin'), asyncHandler(async (req: Request, res: Response) => {
  const UpdateUserSchema = z.object({
    isActive: z.boolean().optional(),
  });
  const body = UpdateUserSchema.parse(req.body);

  const { data: targetUser } = await supabase
    .from('users')
    .select('role')
    .eq('id', req.params.id)
    .eq('institution_id', req.user!.institutionId)
    .single();

  if (!targetUser) throw new AppError(404, 'User not found');
  if (targetUser.role === 'admin') throw new AppError(403, 'Cannot deactivate an admin');

  const { data, error } = await supabase
    .from('users')
    .update({ is_active: body.isActive })
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) throw new AppError(500, error.message);
  res.json(data);
}));
