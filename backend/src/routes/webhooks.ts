import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { supabase } from '../db/supabase';
import { asyncHandler } from '../middleware/errorHandler';
import { sendWhatsAppAlert } from '../services/notificationService';
import { logger } from '../utils/logger';

export const webhookRouter = Router();

// POST /api/webhooks/n8n/deadline-reminder
webhookRouter.post('/n8n/deadline-reminder', asyncHandler(async (req: Request, res: Response) => {
  const body = req.body as {
    taskId: string;
    userId: string;
    institutionId: string;
    status: string;
    executionId?: string;
  };

  await supabase.from('automation_logs').insert({
    institution_id: body.institutionId,
    workflow_name: 'deadline-reminder',
    execution_id: body.executionId ?? null,
    trigger_source: 'n8n',
    status: body.status,
    payload: body,
  });

  res.json({ received: true });
}));

// POST /api/webhooks/n8n/notice-broadcast
webhookRouter.post('/n8n/notice-broadcast', asyncHandler(async (req: Request, res: Response) => {
  const body = req.body as {
    noticeId: string;
    institutionId: string;
    status: string;
    executionId?: string;
  };

  await supabase.from('automation_logs').insert({
    institution_id: body.institutionId,
    workflow_name: 'notice-broadcast',
    execution_id: body.executionId ?? null,
    trigger_source: 'n8n',
    status: body.status,
    payload: body,
  });

  res.json({ received: true });
}));

// POST /api/webhooks/direct/send-whatsapp
webhookRouter.post('/direct/send-whatsapp', asyncHandler(async (req: Request, res: Response) => {
  const schema = z.object({
    to: z.string(),
    message: z.string(),
    institutionId: z.string().uuid().optional(),
  });
  const body = schema.parse(req.body);

  await sendWhatsAppAlert(body.to, body.message);

  if (body.institutionId) {
    try {
      await supabase.from('automation_logs').insert({
        institution_id: body.institutionId,
        workflow_name: 'whatsapp-direct',
        trigger_source: 'direct_api',
        status: 'success',
        payload: body,
      });
    } catch (err: unknown) {
      logger.error('Failed to log direct whatsapp:', err);
    }
  }

  res.json({ sent: true });
}));
