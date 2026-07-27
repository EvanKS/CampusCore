import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { supabase } from '../db/supabase';
import { authenticate } from '../middleware/auth';
import { asyncHandler, AppError } from '../middleware/errorHandler';

export const notificationsRouter = Router();
notificationsRouter.use(authenticate);

// GET /api/notifications
notificationsRouter.get('/', asyncHandler(async (req: Request, res: Response) => {
  const user = req.user!;
  const { page = '1', limit = '20', unreadOnly } = req.query;

  let q = supabase
    .from('in_app_notifications')
    .select('*', { count: 'exact' })
    .eq('user_id', user.userId)
    .eq('institution_id', user.institutionId)
    .order('created_at', { ascending: false })
    .limit(parseInt(limit as string, 10));

  if (unreadOnly === 'true') q = q.eq('is_read', false);

  const { data, error } = await q;
  if (error) throw new AppError(500, error.message);

  const { count: unreadCount } = await supabase
    .from('in_app_notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.userId)
    .eq('is_read', false);

  res.json({ data: data ?? [], unreadCount: unreadCount ?? 0, page: parseInt(page as string, 10) });
}));

// PATCH /api/notifications/:id/read
notificationsRouter.patch('/:id/read', asyncHandler(async (req: Request, res: Response) => {
  const { error } = await supabase
    .from('in_app_notifications')
    .update({ is_read: true })
    .eq('id', req.params.id)
    .eq('user_id', req.user!.userId);

  if (error) throw new AppError(500, error.message);
  res.json({ message: 'Marked as read' });
}));

// PATCH /api/notifications/read-all
notificationsRouter.patch('/read-all', asyncHandler(async (req: Request, res: Response) => {
  const { error } = await supabase
    .from('in_app_notifications')
    .update({ is_read: true })
    .eq('user_id', req.user!.userId);

  if (error) throw new AppError(500, error.message);
  res.json({ message: 'All notifications marked as read' });
}));

// GET /api/notifications/preferences
notificationsRouter.get('/preferences', asyncHandler(async (req: Request, res: Response) => {
  const { data, error } = await supabase
    .from('users')
    .select('notification_prefs')
    .eq('id', req.user!.userId)
    .single();

  if (error || !data) throw new AppError(404, 'User not found');
  const prefs = (data as Record<string, unknown>).notification_prefs ?? { email: true, whatsapp: true, in_app: true };
  res.json({ data: prefs });
}));

// PATCH /api/notifications/preferences
notificationsRouter.patch('/preferences', asyncHandler(async (req: Request, res: Response) => {
  const PrefSchema = z.object({
    email: z.boolean().optional(),
    whatsapp: z.boolean().optional(),
    in_app: z.boolean().optional(),
  });
  const body = PrefSchema.parse(req.body);

  const { data: user } = await supabase
    .from('users')
    .select('notification_prefs')
    .eq('id', req.user!.userId)
    .single();

  const currentPrefs = (user as Record<string, unknown> | null)?.notification_prefs as Record<string, boolean> ?? {};
  const updatedPrefs = { ...currentPrefs, ...body };

  const { data, error } = await supabase
    .from('users')
    .update({ notification_prefs: updatedPrefs })
    .eq('id', req.user!.userId)
    .select('notification_prefs')
    .single();

  if (error) throw new AppError(500, error.message);
  res.json({ data: (data as Record<string, unknown>).notification_prefs });
}));
