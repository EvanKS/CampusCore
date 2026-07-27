import twilio from 'twilio';
import nodemailer from 'nodemailer';
import { google } from 'googleapis';
import { supabase } from '../db/supabase';
import { logger } from '../utils/logger';

let twilioClient: ReturnType<typeof twilio> | null = null;

function getTwilioClient() {
  if (!twilioClient) {
    twilioClient = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
  }
  return twilioClient;
}

export async function sendWhatsAppAlert(to: string, message: string): Promise<void> {
  try {
    const client = getTwilioClient();
    const from = process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886';
    const toNumber = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;

    await client.messages.create({
      from,
      to: toNumber,
      body: message,
    });
    logger.info(`WhatsApp sent to ${toNumber}`);
  } catch (err) {
    logger.error('WhatsApp send failed:', err);
    throw err;
  }
}

let emailTransporter: nodemailer.Transporter | null = null;

function getEmailTransporter() {
  if (!emailTransporter) {
    emailTransporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  return emailTransporter;
}

export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
}): Promise<void> {
  try {
    const transporter = getEmailTransporter();
    await transporter.sendMail({
      from: process.env.SMTP_FROM || 'CampusFlow <noreply@campusflow.app>',
      to: params.to,
      subject: params.subject,
      html: params.html,
    });
    logger.info(`Email sent to ${params.to}`);
  } catch (err) {
    logger.error('Email send failed:', err);
    throw err;
  }
}

export function generateGoogleCalendarUrl(params: {
  title: string;
  description: string;
  startTime?: string;
  endTime?: string;
}): string {
  const formatGCalDate = (isoStr?: string) => {
    const d = isoStr ? new Date(isoStr) : new Date();
    return d.toISOString().replace(/-|:|\.\d\d\d/g, '');
  };
  const start = formatGCalDate(params.startTime);
  const end = formatGCalDate(params.endTime || new Date(Date.now() + 60 * 60 * 1000).toISOString());
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(params.title)}&details=${encodeURIComponent(params.description)}&dates=${start}/${end}`;
}

export async function createCalendarEvent(params: {
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  calendarId?: string;
}): Promise<string | null> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_CALENDAR_REFRESH_TOKEN;

  if (!clientId || !refreshToken || clientId.includes('your_') || refreshToken.includes('your_')) {
    logger.warn('Google Calendar API credentials missing or incomplete in .env. Skipping server-side Google Calendar event creation.');
    return null;
  }

  try {
    const auth = new google.auth.OAuth2(clientId, clientSecret);
    auth.setCredentials({ refresh_token: refreshToken });

    const calendar = google.calendar({ version: 'v3', auth });
    const event = await calendar.events.insert({
      calendarId: params.calendarId || 'primary',
      requestBody: {
        summary: params.title,
        description: params.description,
        start: { dateTime: params.startTime, timeZone: 'Asia/Kolkata' },
        end: { dateTime: params.endTime, timeZone: 'Asia/Kolkata' },
      },
    });

    logger.info(`Calendar event created: ${event.data.id}`);
    return event.data.id ?? null;
  } catch (err) {
    logger.error('Google Calendar event creation failed:', err);
    return null;
  }
}

export async function triggerN8nWebhook(
  workflowName: string,
  payload: Record<string, unknown>
): Promise<void> {
  let url = process.env[`N8N_${workflowName.toUpperCase().replace(/-/g, '_')}_WEBHOOK_URL` as keyof typeof process.env];
  if (!url) {
    const baseUrl = process.env.N8N_WEBHOOK_BASE_URL || 'http://localhost:5678/webhook';
    url = `${baseUrl}/${workflowName}`;
  }

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (process.env.N8N_HEADER_NAME && process.env.N8N_HEADER_VALUE) {
    headers[process.env.N8N_HEADER_NAME] = process.env.N8N_HEADER_VALUE;
  } else if (process.env.N8N_BEARER_TOKEN) {
    headers['Authorization'] = `Bearer ${process.env.N8N_BEARER_TOKEN}`;
  }

  // Try production URL first
  let response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(10000),
  }).catch(() => null);

  // If 401, 404 or failed, try test URL fallback (webhook-test) when n8n canvas is listening
  if (!response || response.status === 404 || response.status === 401) {
    const testUrl = url.replace('/webhook/', '/webhook-test/');
    const testResponse = await fetch(testUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000),
    }).catch(() => null);

    if (testResponse && testResponse.ok) {
      logger.info(`n8n webhook triggered (test mode): ${workflowName} (${testUrl})`);
      return;
    }
  }

  if (!response || !response.ok) {
    throw new Error(`n8n webhook returned ${response?.status ?? 'network error'} for ${url}`);
  }
  logger.info(`n8n webhook triggered: ${workflowName} (${url})`);
}

export async function broadcastNoticeToStudents(params: {
  noticeId: string;
  institutionId: string;
  title: string;
  aiSummary: string | null;
  targetScope: string;
  targetBranch?: string;
  targetYear?: number;
}): Promise<void> {
  try {
    let q = supabase
      .from('users')
      .select('id, phone, email, notification_prefs, full_name, student_profiles(branch, year)')
      .eq('institution_id', params.institutionId)
      .eq('role', 'student')
      .eq('is_active', true);

    const { data: students } = await q;
    const studentList = (students ?? []) as Array<Record<string, unknown>>;

    // Deduplicate phones — one WhatsApp per unique phone number, not per student record
    const seenPhones = new Set<string>();
    const uniquePhoneStudents = studentList.filter(s => {
      const phone = s.phone as string | null;
      if (!phone || seenPhones.has(phone)) return false;
      seenPhones.add(phone);
      return true;
    });

    const now = new Date();
    const startTime = now.toISOString();
    const endTime = new Date(now.getTime() + 60 * 60 * 1000).toISOString();

    const gcalUrl = generateGoogleCalendarUrl({
      title: `[Notice] ${params.title}`,
      description: params.aiSummary || params.title,
      startTime,
      endTime,
    });

    let n8nSucceeded = false;
    try {
      await triggerN8nWebhook('notice-broadcast', {
        ...params,
        startTime,
        endTime,
        eventDate: startTime,
        summary: `Notice: ${params.title}`,
        description: params.aiSummary || params.title,
        googleCalendarUrl: gcalUrl,
        students: uniquePhoneStudents.map(s => ({
          id: s.id,
          full_name: s.full_name,
          email: s.email,
          phone: s.phone,
          title: params.title,
          aiSummary: params.aiSummary,
          summary: `Notice: ${params.title}`,
          description: params.aiSummary || params.title,
          startTime,
          endTime,
          eventDate: startTime,
          noticeId: params.noticeId,
          googleCalendarUrl: gcalUrl,
        })),
      });
      n8nSucceeded = true;
    } catch (n8nErr) {
      logger.warn('n8n notice-broadcast webhook failed, using direct-API fallback:', n8nErr);
    }

    const message = (params.aiSummary
      ? `📢 *${params.title}*\n\n${params.aiSummary}`
      : `📢 *${params.title}*\n\nPlease check CampusFlow for full details.`)
      + `\n\n📅 *Add to Google Calendar:* ${gcalUrl}`;

    // Direct fallback: only if n8n failed, and only unique phones
    if (!n8nSucceeded) {
      for (const student of uniquePhoneStudents) {
        const prefs = student.notification_prefs as { whatsapp?: boolean } | null;
        const whatsappEnabled = prefs === null || prefs === undefined ? true : (prefs.whatsapp !== false);
        if (whatsappEnabled && student.phone) {
          try {
            await sendWhatsAppAlert(student.phone as string, message);
          } catch { /* ignored */ }
        }
      }
    }

    // In-app notifications: one per student user (not deduplicated — each student gets their own)
    for (const student of studentList) {
      const prefs = student.notification_prefs as { in_app?: boolean } | null;
      if (prefs?.in_app !== false) {
        try {
          await supabase.from('in_app_notifications').insert({
            institution_id: params.institutionId,
            user_id: student.id,
            title: `Notice: ${params.title}`,
            body: message,
            related_entity_id: params.noticeId,
            related_entity_type: 'notice',
          });
        } catch {}
      }
    }

    await supabase.from('automation_logs').insert({
      institution_id: params.institutionId,
      workflow_name: 'notice-broadcast',
      trigger_source: 'direct_api',
      status: 'success',
      payload: { noticeId: params.noticeId, recipients: (students ?? []).length },
    });

    logger.info(`Notice broadcast completed: ${params.noticeId}`);
  } catch (err) {
    logger.error('Notice broadcast failed:', err);
  }
}
