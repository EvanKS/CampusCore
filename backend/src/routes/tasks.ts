import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { supabase } from '../db/supabase';
import { authenticate, authorize } from '../middleware/auth';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import { scheduleDeadlineReminder } from '../services/queueService';
import { triggerN8nWebhook } from '../services/notificationService';

export const tasksRouter = Router();
tasksRouter.use(authenticate);

const CreateTaskSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().optional().nullable().or(z.literal('')),
  subjectId: z.string().uuid().optional().nullable().or(z.literal('')),
  status: z.enum(['pending', 'in_progress', 'completed', 'overdue']).default('pending'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  deadlineAt: z.string().optional().nullable().or(z.literal('')),
});

const UpdateTaskSchema = CreateTaskSchema.partial();

import { generateGoogleCalendarUrl, createCalendarEvent, sendWhatsAppAlert } from '../services/notificationService';

// GET /api/tasks
tasksRouter.get('/', asyncHandler(async (req: Request, res: Response) => {
  const { status, priority, limit = '20' } = req.query;
  const user = req.user!;

  let q = supabase
    .from('tasks')
    .select('*, subjects(name, code)')
    .eq('institution_id', user.institutionId)
    .order('deadline_at', { ascending: true, nullsFirst: false })
    .limit(parseInt(limit as string, 10));

  if (user.role === 'student') {
    q = q.eq('student_user_id', user.userId);
  } else if (user.role === 'parent') {
    const { data: links } = await supabase
      .from('parent_student_links')
      .select('student_user_id')
      .eq('parent_user_id', user.userId);
    const childIds = (links ?? []).map(d => d.student_user_id).filter(Boolean);
    if (childIds.length === 0) {
      res.json({ data: [] });
      return;
    }
    q = q.in('student_user_id', childIds);
  }
  if (status) q = q.eq('status', status as string);
  if (priority) q = q.eq('priority', priority as string);

  const { data, error } = await q;
  if (error) throw new AppError(500, error.message);

  // Flatten join & generate Google Calendar URLs
  const rows = (data ?? []).map((t: Record<string, unknown>) => {
    const startTime = (t.deadline_at as string) || new Date().toISOString();
    const endTime = new Date(new Date(startTime).getTime() + 60 * 60 * 1000).toISOString();
    return {
      ...t,
      subject_name: (t.subjects as Record<string, string> | null)?.name,
      subject_code: (t.subjects as Record<string, string> | null)?.code,
      subjects: undefined,
      google_calendar_url: generateGoogleCalendarUrl({
        title: `[CampusFlow] ${t.title}`,
        description: (t.description as string) || `Task Deadline for ${t.title}`,
        startTime,
        endTime,
      }),
    };
  });

  res.json({ data: rows });
}));

// GET /api/tasks/:id
tasksRouter.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const user = req.user!;
  const { data, error } = await supabase
    .from('tasks')
    .select('*, subjects(name)')
    .eq('id', req.params.id)
    .eq('institution_id', user.institutionId)
    .single();

  if (error || !data) throw new AppError(404, 'Task not found');
  if (user.role === 'student' && (data as Record<string, string>).student_user_id !== user.userId) {
    throw new AppError(403, 'Access denied');
  }
  res.json(data);
}));

// POST /api/tasks
tasksRouter.post('/', authorize('student'), asyncHandler(async (req: Request, res: Response) => {
  const body = CreateTaskSchema.parse(req.body);
  const user = req.user!;

  const subjectId = (body.subjectId && body.subjectId.trim() !== '') ? body.subjectId : null;
  const description = (body.description && body.description.trim() !== '') ? body.description : null;
  let deadlineAt: string | null = null;

  if (body.deadlineAt && body.deadlineAt.trim() !== '') {
    const d = new Date(body.deadlineAt);
    if (!isNaN(d.getTime())) {
      deadlineAt = d.toISOString();
    }
  }

  const { data, error } = await supabase
    .from('tasks')
    .insert({
      institution_id: user.institutionId,
      student_user_id: user.userId,
      subject_id: subjectId,
      title: body.title,
      description: description,
      status: body.status,
      priority: body.priority,
      deadline_at: deadlineAt,
    })
    .select()
    .single();

  if (error) throw new AppError(500, error.message);
  const task = data as Record<string, unknown>;

  const finalDeadline = deadlineAt || new Date(Date.now() + 86400000).toISOString();

  // 1. Trigger Google Calendar creation for creator's calendar automatically
  const endTime = new Date(new Date(finalDeadline).getTime() + 60 * 60 * 1000).toISOString();
  try {
    await createCalendarEvent({
      title: `[CampusFlow] ${task.title as string}`,
      description: (task.description as string) || `Task Deadline for ${task.title as string}`,
      startTime: finalDeadline,
      endTime: endTime,
    });
  } catch (err) {
    // calendar optional
  }

  // 2. Generate Google Calendar invite URL for other users
  const gcalUrl = generateGoogleCalendarUrl({
    title: `[CampusFlow] ${task.title as string}`,
    description: (task.description as string) || `Task Deadline for ${task.title as string}`,
    startTime: finalDeadline,
    endTime: endTime,
  });

  // Trigger deadline reminder webhook & direct WhatsApp alert
  try {
    const { data: userData } = await supabase.from('users').select('phone').eq('id', user.userId).single();
    const phone = userData?.phone || '+919611789501';

    const formattedDeadline = new Date(finalDeadline).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
    const message = `⏰ *CampusFlow Reminder*\n\nYour task *"${task.title as string}"* is created!\n📅 Deadline: ${formattedDeadline}\n\n📅 *Add to Google Calendar:* ${gcalUrl}\n\nStay on track! 💪`;

    // Direct WhatsApp send
    await sendWhatsAppAlert(phone, message);

    // Optional n8n webhook call
    await triggerN8nWebhook('deadline-reminder', { 
      taskId: task.id, 
      userId: user.userId, 
      institutionId: user.institutionId, 
      title: task.title, 
      deadlineAt: finalDeadline,
      phone: phone,
      googleCalendarUrl: gcalUrl,
    });
  } catch (err) {
    // optional
  }
  if (deadlineAt) {
    try {
      await scheduleDeadlineReminder({ taskId: task.id as string, userId: user.userId, institutionId: user.institutionId, title: task.title as string, deadlineAt: new Date(deadlineAt) });
    } catch { /* queue optional */ }
  }

  res.status(201).json({
    ...task,
    google_calendar_url: gcalUrl,
  });
}));

// PATCH /api/tasks/:id
tasksRouter.patch('/:id', authorize('student'), asyncHandler(async (req: Request, res: Response) => {
  const body = UpdateTaskSchema.parse(req.body);
  const user = req.user!;
  const updates: Record<string, unknown> = {};

  if (body.title !== undefined) updates.title = body.title;
  if (body.description !== undefined) updates.description = (body.description && body.description.trim() !== '') ? body.description : null;
  if (body.status !== undefined) updates.status = body.status;
  if (body.priority !== undefined) updates.priority = body.priority;
  if (body.subjectId !== undefined) updates.subject_id = (body.subjectId && body.subjectId.trim() !== '') ? body.subjectId : null;
  if (body.deadlineAt !== undefined) {
    if (body.deadlineAt && body.deadlineAt.trim() !== '') {
      const d = new Date(body.deadlineAt);
      updates.deadline_at = !isNaN(d.getTime()) ? d.toISOString() : null;
    } else {
      updates.deadline_at = null;
    }
  }

  if (Object.keys(updates).length === 0) { res.json({ message: 'No changes' }); return; }

  const { data, error } = await supabase
    .from('tasks')
    .update(updates)
    .eq('id', req.params.id)
    .eq('student_user_id', user.userId)
    .eq('institution_id', user.institutionId)
    .select()
    .single();

  if (error || !data) throw new AppError(404, 'Task not found');
  res.json(data);
}));

// DELETE /api/tasks/:id
tasksRouter.delete('/:id', authorize('student'), asyncHandler(async (req: Request, res: Response) => {
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', req.params.id)
    .eq('student_user_id', req.user!.userId)
    .eq('institution_id', req.user!.institutionId);

  if (error) throw new AppError(500, error.message);
  res.status(204).send();
}));
