import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { supabase } from '../db/supabase';
import { authenticate, authorize } from '../middleware/auth';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import { generateAISummary } from '../services/aiService';
import { broadcastNoticeToStudents } from '../services/notificationService';

export const noticesRouter = Router();
noticesRouter.use(authenticate);

const CreateNoticeSchema = z.object({
  title: z.string().min(1).max(500),
  body: z.string().min(1),
  targetScope: z.enum(['all', 'students', 'teachers', 'parents', 'specific_branch', 'specific_year']).default('all'),
  targetBranch: z.string().optional().nullable().or(z.literal('')),
  targetYear: z.number().int().optional().nullable().or(z.literal('')),
  isBroadcast: z.boolean().default(false),
});

// GET /api/notices
noticesRouter.get('/', asyncHandler(async (req: Request, res: Response) => {
  const user = req.user!;
  const { page = '1', limit = '20' } = req.query;

  const { data, error } = await supabase
    .from('notices')
    .select('*, users!notices_author_user_id_fkey(full_name)')
    .eq('institution_id', user.institutionId)
    .not('published_at', 'is', null)
    .order('published_at', { ascending: false })
    .limit(parseInt(limit as string, 10));

  if (error) throw new AppError(500, error.message);

  const rows = (data ?? []).map((n: Record<string, unknown>) => ({
    ...n,
    author_name: (n.users as Record<string, string> | null)?.full_name ?? 'Faculty',
    users: undefined,
  }));

  res.json({ data: rows, page: parseInt(page as string, 10) });
}));

// GET /api/notices/:id
noticesRouter.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const user = req.user!;
  const { data, error } = await supabase
    .from('notices')
    .select('*, users!notices_author_user_id_fkey(full_name)')
    .eq('id', req.params.id)
    .eq('institution_id', user.institutionId)
    .single();

  if (error || !data) throw new AppError(404, 'Notice not found');

  const notice = {
    ...data,
    author_name: (data.users as Record<string, string> | null)?.full_name ?? 'Faculty',
    users: undefined,
  };

  res.json(notice);
}));

// POST /api/notices
noticesRouter.post('/', authorize('teacher', 'admin'), asyncHandler(async (req: Request, res: Response) => {
  const body = CreateNoticeSchema.parse(req.body);
  const user = req.user!;

  let aiSummary: string | null = null;
  try {
    aiSummary = await generateAISummary(body.title, body.body);
  } catch {
    // optional
  }

  const { data, error } = await supabase
    .from('notices')
    .insert({
      institution_id: user.institutionId,
      author_user_id: user.userId,
      title: body.title,
      body: body.body,
      ai_summary: aiSummary,
      target_scope: body.targetScope,
      target_branch: body.targetBranch ?? null,
      target_year: body.targetYear ?? null,
      is_broadcast: body.isBroadcast,
      published_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw new AppError(500, error.message);
  const notice = data as Record<string, unknown>;

  try {
    await broadcastNoticeToStudents({
      noticeId: notice.id as string,
      institutionId: user.institutionId,
      title: notice.title as string,
      aiSummary,
      targetScope: body.targetScope,
      targetBranch: typeof body.targetBranch === 'string' && body.targetBranch.trim() !== '' ? body.targetBranch : undefined,
      targetYear: typeof body.targetYear === 'number' ? body.targetYear : undefined,
    });
  } catch { }

  res.status(201).json(notice);
}));

// PATCH /api/notices/:id
noticesRouter.patch('/:id', authorize('teacher', 'admin'), asyncHandler(async (req: Request, res: Response) => {
  const body = CreateNoticeSchema.partial().parse(req.body);
  const user = req.user!;

  const { data: existing } = await supabase
    .from('notices')
    .select('author_user_id')
    .eq('id', req.params.id)
    .eq('institution_id', user.institutionId)
    .single();

  if (!existing) throw new AppError(404, 'Notice not found');
  if (user.role !== 'admin' && (existing as Record<string, string>).author_user_id !== user.userId) {
    throw new AppError(403, 'Access denied');
  }

  const updates: Record<string, unknown> = {};
  if (body.title !== undefined) updates.title = body.title;
  if (body.body !== undefined) updates.body = body.body;
  if (body.targetScope !== undefined) updates.target_scope = body.targetScope;

  const { data, error } = await supabase
    .from('notices')
    .update(updates)
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) throw new AppError(500, error.message);
  res.json(data);
}));

// DELETE /api/notices/:id
noticesRouter.delete('/:id', authorize('admin'), asyncHandler(async (req: Request, res: Response) => {
  const user = req.user!;
  const { error } = await supabase.from('notices').delete().eq('id', req.params.id).eq('institution_id', user.institutionId);
  if (error) throw new AppError(500, error.message);
  res.status(204).send();
}));
