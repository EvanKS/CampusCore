import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { supabase } from '../db/supabase';
import { authenticate, authorize } from '../middleware/auth';
import { asyncHandler, AppError } from '../middleware/errorHandler';

export const placementRouter = Router();
placementRouter.use(authenticate, authorize('student', 'admin'));

const CreateSchema = z.object({
  companyName: z.string().min(1),
  role: z.string().min(1),
  status: z.enum(['applied', 'screening', 'interview', 'offer', 'rejected', 'withdrawn']).default('applied'),
  appliedAt: z.string().optional().nullable().or(z.literal('')),
  nextStep: z.string().optional().nullable().or(z.literal('')),
  notes: z.string().optional().nullable().or(z.literal('')),
});

// GET /api/placement
placementRouter.get('/', asyncHandler(async (req: Request, res: Response) => {
  const user = req.user!;
  let q = supabase
    .from('placement_applications')
    .select('*')
    .eq('institution_id', user.institutionId)
    .order('created_at', { ascending: false });

  if (user.role === 'student') {
    q = q.eq('student_user_id', user.userId);
  }

  const { data, error } = await q;
  if (error) throw new AppError(500, error.message);
  res.json({ data: data ?? [] });
}));

// POST /api/placement
placementRouter.post('/', authorize('student'), asyncHandler(async (req: Request, res: Response) => {
  const body = CreateSchema.parse(req.body);
  const user = req.user!;

  const appliedAt = (body.appliedAt && body.appliedAt.trim() !== '') ? body.appliedAt : null;
  const nextStep = (body.nextStep && body.nextStep.trim() !== '') ? body.nextStep : null;
  const notes = (body.notes && body.notes.trim() !== '') ? body.notes : null;

  const { data, error } = await supabase
    .from('placement_applications')
    .insert({
      institution_id: user.institutionId,
      student_user_id: user.userId,
      company_name: body.companyName,
      role: body.role,
      status: body.status,
      applied_at: appliedAt,
      next_step: nextStep,
      notes: notes,
    })
    .select()
    .single();

  if (error) throw new AppError(500, error.message);
  res.status(201).json(data);
}));

// PATCH /api/placement/:id
placementRouter.patch('/:id', authorize('student'), asyncHandler(async (req: Request, res: Response) => {
  const body = CreateSchema.partial().parse(req.body);
  const user = req.user!;

  const { data: existing } = await supabase
    .from('placement_applications')
    .select('student_user_id')
    .eq('id', req.params.id)
    .eq('institution_id', user.institutionId)
    .single();

  if (!existing) throw new AppError(404, 'Application not found');
  if ((existing as Record<string, string>).student_user_id !== user.userId) throw new AppError(403, 'Access denied');

  const updates: Record<string, unknown> = {};
  if (body.companyName !== undefined) updates.company_name = body.companyName;
  if (body.role !== undefined) updates.role = body.role;
  if (body.status !== undefined) updates.status = body.status;
  if (body.nextStep !== undefined) updates.next_step = body.nextStep;
  if (body.notes !== undefined) updates.notes = body.notes;

  if (Object.keys(updates).length === 0) { res.json({ message: 'No changes' }); return; }

  const { data, error } = await supabase
    .from('placement_applications')
    .update(updates)
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) throw new AppError(500, error.message);
  res.json(data);
}));

// DELETE /api/placement/:id
placementRouter.delete('/:id', authorize('student'), asyncHandler(async (req: Request, res: Response) => {
  const user = req.user!;
  const { data: existing } = await supabase
    .from('placement_applications')
    .select('student_user_id')
    .eq('id', req.params.id)
    .eq('institution_id', user.institutionId)
    .single();

  if (!existing) throw new AppError(404, 'Application not found');
  if ((existing as Record<string, string>).student_user_id !== user.userId) throw new AppError(403, 'Access denied');

  await supabase.from('placement_applications').delete().eq('id', req.params.id);
  res.status(204).send();
}));
