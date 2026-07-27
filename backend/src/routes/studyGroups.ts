import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { supabase } from '../db/supabase';
import { authenticate, authorize } from '../middleware/auth';
import { asyncHandler, AppError } from '../middleware/errorHandler';

export const studyGroupsRouter = Router();
studyGroupsRouter.use(authenticate);

const CreateGroupSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional().nullable().or(z.literal('')),
  subjectId: z.string().uuid().optional().nullable().or(z.literal('')),
  maxMembers: z.number().int().min(2).max(50).default(10),
  meetingSchedule: z.record(z.unknown()).optional().nullable(),
  googleMeetLink: z.string().optional().nullable().or(z.literal('')),
});

// GET /api/study-groups
studyGroupsRouter.get('/', asyncHandler(async (req: Request, res: Response) => {
  const user = req.user!;
  const { data, error } = await supabase
    .from('study_groups')
    .select('*, subjects(name), users!study_groups_created_by_fkey(full_name), study_group_members(id)')
    .eq('institution_id', user.institutionId)
    .order('created_at', { ascending: false });

  if (error) throw new AppError(500, error.message);

  const rows = (data ?? []).map((sg: Record<string, unknown>) => ({
    ...sg,
    subject_name: (sg.subjects as Record<string, string> | null)?.name,
    creator_name: (sg.users as Record<string, string> | null)?.full_name,
    member_count: Array.isArray(sg.study_group_members) ? sg.study_group_members.length : 0,
    subjects: undefined,
    users: undefined,
    study_group_members: undefined,
  }));

  res.json({ data: rows });
}));

// GET /api/study-groups/:id
studyGroupsRouter.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const user = req.user!;
  const { data: group, error } = await supabase
    .from('study_groups')
    .select('*, subjects(name), users!study_groups_created_by_fkey(full_name)')
    .eq('id', req.params.id)
    .eq('institution_id', user.institutionId)
    .single();

  if (error || !group) throw new AppError(404, 'Study group not found');

  const { data: members } = await supabase
    .from('study_group_members')
    .select('user_id, joined_at, users(id, full_name, avatar_url)')
    .eq('group_id', req.params.id);

  const formattedMembers = (members ?? []).map((m: Record<string, unknown>) => ({
    id: (m.users as Record<string, string> | null)?.id,
    full_name: (m.users as Record<string, string> | null)?.full_name,
    avatar_url: (m.users as Record<string, string> | null)?.avatar_url,
    joined_at: m.joined_at,
  }));

  res.json({
    ...group,
    subject_name: (group.subjects as Record<string, string> | null)?.name,
    creator_name: (group.users as Record<string, string> | null)?.full_name,
    members: formattedMembers,
  });
}));

// POST /api/study-groups
studyGroupsRouter.post('/', authorize('student'), asyncHandler(async (req: Request, res: Response) => {
  const body = CreateGroupSchema.parse(req.body);
  const user = req.user!;

  const { data: group, error } = await supabase
    .from('study_groups')
    .insert({
      institution_id: user.institutionId,
      subject_id: body.subjectId ?? null,
      name: body.name,
      description: body.description ?? null,
      created_by: user.userId,
      max_members: body.maxMembers,
      meeting_schedule: body.meetingSchedule ?? null,
      google_meet_link: body.googleMeetLink ?? null,
    })
    .select()
    .single();

  if (error) throw new AppError(500, error.message);

  await supabase.from('study_group_members').insert({
    group_id: (group as Record<string, string>).id,
    user_id: user.userId,
  });

  res.status(201).json(group);
}));

// POST /api/study-groups/:id/join
studyGroupsRouter.post('/:id/join', asyncHandler(async (req: Request, res: Response) => {
  const user = req.user!;
  const { data: group } = await supabase
    .from('study_groups')
    .select('max_members')
    .eq('id', req.params.id)
    .eq('institution_id', user.institutionId)
    .single();

  if (!group) throw new AppError(404, 'Study group not found');

  const { count } = await supabase
    .from('study_group_members')
    .select('id', { count: 'exact', head: true })
    .eq('group_id', req.params.id);

  if ((count ?? 0) >= (group as Record<string, number>).max_members) {
    throw new AppError(409, 'Study group is full');
  }

  await supabase.from('study_group_members').upsert({
    group_id: req.params.id,
    user_id: user.userId,
  });

  res.json({ message: 'Joined study group' });
}));

// DELETE /api/study-groups/:id/leave
studyGroupsRouter.delete('/:id/leave', asyncHandler(async (req: Request, res: Response) => {
  await supabase
    .from('study_group_members')
    .delete()
    .eq('group_id', req.params.id)
    .eq('user_id', req.user!.userId);

  res.json({ message: 'Left study group' });
}));
