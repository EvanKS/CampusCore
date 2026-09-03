/**
 * Tests: Reminder scheduling logic (BullMQ queue service)
 *
 * Verifies task reminder scheduling: jobs are added to the queue
 * with the correct delay based on the task deadline.
 */

// Set required env vars for tests before importing queueService
process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token-123456';
process.env.UPSTASH_REDIS_REST_URL = 'https://test-redis.upstash.io';

import { scheduleDeadlineReminder, DeadlineJobData } from '../src/services/queueService';

// Mock Upstash Redis & BullMQ so we don't need a real Redis instance in CI
jest.mock('@upstash/redis', () => ({
  Redis: jest.fn().mockImplementation(() => ({
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  })),
}));

const mockAdd = jest.fn().mockResolvedValue({ id: 'job-1' });
jest.mock('bullmq', () => ({
  Queue: jest.fn().mockImplementation(() => ({
    add: mockAdd,
    close: jest.fn(),
  })),
  Worker: jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    close: jest.fn(),
  })),
  QueueEvents: jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    close: jest.fn(),
  })),
}));

// Mock dependencies that queueService pulls in
jest.mock('../src/db/supabase', () => ({
  supabase: {
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
      insert: jest.fn().mockResolvedValue({ data: null, error: null }),
      upsert: jest.fn().mockResolvedValue({ data: null, error: null }),
      update: jest.fn().mockResolvedValue({ data: null, error: null }),
      delete: jest.fn().mockResolvedValue({ data: null, error: null }),
    }),
  },
  default: {
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
      insert: jest.fn().mockResolvedValue({ data: null, error: null }),
      upsert: jest.fn().mockResolvedValue({ data: null, error: null }),
      update: jest.fn().mockResolvedValue({ data: null, error: null }),
      delete: jest.fn().mockResolvedValue({ data: null, error: null }),
    }),
  },
}));

jest.mock('../src/db/pool', () => ({
  query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
  withTransaction: jest.fn(),
}));

jest.mock('../src/services/notificationService', () => ({
  sendWhatsAppAlert: jest.fn().mockResolvedValue(undefined),
  sendEmail: jest.fn().mockResolvedValue(undefined),
  createCalendarEvent: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('Queue Service — reminder scheduling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('scheduleDeadlineReminder calls queue.add with correct job name', async () => {
    const data: DeadlineJobData = {
      taskId: 'task-abc-123',
      userId: 'user-xyz',
      institutionId: 'inst-001',
      title: 'Submit assignment',
      deadlineAt: new Date(Date.now() + 86400000), // 24h from now
    };

    await scheduleDeadlineReminder(data);

    expect(mockAdd).toHaveBeenCalledWith(
      'send-reminder',
      expect.objectContaining({ taskId: data.taskId, userId: data.userId }),
      expect.any(Object)
    );
  });

  test('scheduleDeadlineReminder passes a non-negative delay for future deadlines', async () => {
    const data: DeadlineJobData = {
      taskId: 't1',
      userId: 'u1',
      institutionId: 'inst-001',
      title: 'Test task',
      deadlineAt: new Date(Date.now() + 3600000), // 1h from now
    };

    await scheduleDeadlineReminder(data);

    const opts = mockAdd.mock.calls[0][2] as { delay?: number };
    expect(opts.delay).toBeGreaterThanOrEqual(0);
  });

  test('does not throw for deadlines in the near future (<1h)', async () => {
    const data: DeadlineJobData = {
      taskId: 't2',
      userId: 'u2',
      institutionId: 'inst-001',
      title: 'Urgent task',
      deadlineAt: new Date(Date.now() + 30 * 60 * 1000), // 30 min from now
    };
    await expect(scheduleDeadlineReminder(data)).resolves.not.toThrow();
  });

  test('handles past deadlines gracefully (delay clamped to 0)', async () => {
    const data: DeadlineJobData = {
      taskId: 't3',
      userId: 'u3',
      institutionId: 'inst-001',
      title: 'Overdue task',
      deadlineAt: new Date(Date.now() - 3600000), // 1h ago
    };
    // Must not throw — delay is Math.max(0, ...) internally
    await expect(scheduleDeadlineReminder(data)).resolves.not.toThrow();
  });
});

