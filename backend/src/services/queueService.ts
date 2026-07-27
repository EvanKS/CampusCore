import { Queue, Worker, Job } from 'bullmq';
import { sendWhatsAppAlert, sendEmail, generateGoogleCalendarUrl } from './notificationService';
import { supabase } from '../db/supabase';
import { logger } from '../utils/logger';

const redisConfig = {
  host: process.env.UPSTASH_REDIS_REST_URL?.replace('https://', '').split('.')[0] + '.upstash.io',
  port: 6379,
  password: process.env.UPSTASH_REDIS_REST_TOKEN,
  tls: {},
  enableOfflineQueue: false,
  maxRetriesPerRequest: null,
};

let deadlineQueue: Queue | null = null;
let deadlineWorker: Worker | null = null;

export interface DeadlineJobData {
  taskId: string;
  userId: string;
  institutionId: string;
  title: string;
  deadlineAt: Date;
}

function getDeadlineQueue(): Queue | null {
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  const url = process.env.UPSTASH_REDIS_REST_URL;

  if (!token || !url || token.includes('your-') || url.includes('your-')) {
    return null;
  }

  if (!deadlineQueue) {
    try {
      deadlineQueue = new Queue('deadline-reminders', {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        connection: redisConfig as any,
        defaultJobOptions: {
          removeOnComplete: 100,
          removeOnFail: 50,
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
        },
      });
    } catch (err) {
      logger.error('Failed to create BullMQ queue:', err);
      return null;
    }
  }
  return deadlineQueue;
}

export async function scheduleDeadlineReminder(data: DeadlineJobData): Promise<void> {
  const queue = getDeadlineQueue();
  if (!queue) return;

  const deadlineTime = new Date(data.deadlineAt).getTime();
  const reminderTime = deadlineTime - 24 * 60 * 60 * 1000;
  const delay = Math.max(0, reminderTime - Date.now());

  try {
    await queue.add(
      'send-reminder',
      data,
      {
        delay,
        jobId: `task-${data.taskId}`,
      }
    );
    logger.info(`Reminder scheduled for task ${data.taskId} in ${Math.round(delay / 1000 / 60)} minutes`);
  } catch (err) {
    logger.error('Failed to schedule reminder:', err);
  }
}

export function startDeadlineWorker(): void {
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  const url = process.env.UPSTASH_REDIS_REST_URL;

  if (!token || !url || token.includes('your-') || url.includes('your-')) return;

  deadlineWorker = new Worker(
    'deadline-reminders',
    async (job: Job<DeadlineJobData>) => {
      const { taskId, userId, institutionId, title, deadlineAt } = job.data;

      logger.info(`Processing reminder for task ${taskId}`);

      const { data: user } = await supabase
        .from('users')
        .select('phone, email, full_name, notification_prefs')
        .eq('id', userId)
        .single();

      if (!user) {
        logger.warn(`User ${userId} not found for reminder`);
        return;
      }

      const deadline = new Date(deadlineAt);
      const formattedDeadline = deadline.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

      const gcalUrl = generateGoogleCalendarUrl({
        title: `[Task] ${title}`,
        description: `Task Deadline: ${title}`,
        startTime: deadline.toISOString(),
        endTime: new Date(deadline.getTime() + 3600000).toISOString(),
      });

      const message = `⏰ *CampusFlow Reminder*\n\nYour task *"${title}"* is due in 24 hours!\n📅 Deadline: ${formattedDeadline}\n\n📅 *Add to Google Calendar:* ${gcalUrl}\n\nStay on track! 💪`;

      const prefs = user.notification_prefs as { whatsapp?: boolean; email?: boolean } | null;
      // Default whatsapp to true if prefs not set (opt-out model)
      const whatsappEnabled = prefs === null || prefs === undefined ? true : (prefs.whatsapp !== false);

      if (whatsappEnabled && user.phone) {
        try {
          await sendWhatsAppAlert(user.phone, message);
        } catch { /* ignored */ }
      }

      if (prefs?.email && user.email) {
        await sendEmail({
          to: user.email,
          subject: `Reminder: "${title}" is due in 24 hours`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #6366f1;">⏰ Task Deadline Reminder</h2>
              <p>Hi ${user.full_name},</p>
              <p>Your task <strong>"${title}"</strong> is due in 24 hours!</p>
              <p><strong>Deadline:</strong> ${formattedDeadline}</p>
              <a href="${process.env.FRONTEND_URL}/tasks" 
                 style="background: #6366f1; color: white; padding: 12px 24px; 
                        border-radius: 6px; text-decoration: none; display: inline-block;">
                View Task
              </a>
            </div>
          `,
        }).catch(() => {});
      }

      await supabase.from('automation_logs').insert({
        institution_id: institutionId,
        workflow_name: 'deadline-reminder',
        trigger_source: 'direct_api',
        status: 'success',
        payload: { taskId, userId },
      });
    },
    {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      connection: redisConfig as any,
      concurrency: 5,
    }
  );

  deadlineWorker.on('completed', (job) => {
    logger.info(`Reminder job ${job.id} completed`);
  });

  deadlineWorker.on('failed', async (job, err) => {
    logger.error(`Reminder job ${job?.id} failed:`, err);
  });

  logger.info('Deadline reminder worker started');
}
