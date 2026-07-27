/**
 * Tests: RBAC (Role-Based Access Control) boundaries
 *
 * Verifies that the authorize() middleware correctly enforces role restrictions.
 * Uses Express test helpers with no real DB calls.
 */

import { Request, Response, NextFunction } from 'express';
import { authorize, JwtPayload } from '../src/middleware/auth';

// Minimal mock setup
const mockNext = jest.fn() as jest.MockedFunction<NextFunction>;
const mockRes = {
  status: jest.fn().mockReturnThis(),
  json: jest.fn().mockReturnThis(),
} as unknown as Response;

function makeReq(user?: Partial<JwtPayload>): Request {
  return {
    user: user
      ? {
          userId: user.userId ?? 'u1',
          institutionId: user.institutionId ?? 'i1',
          role: user.role ?? 'student',
          email: user.email ?? 'test@test.com',
        }
      : undefined,
  } as unknown as Request;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('RBAC — authorize() middleware', () => {
  // ── Allow correct roles ───────────────────────────────────
  test('allows student to access student-only route', () => {
    const middleware = authorize('student');
    middleware(makeReq({ role: 'student' }), mockRes, mockNext);
    expect(mockNext).toHaveBeenCalledTimes(1);
    expect(mockRes.status).not.toHaveBeenCalled();
  });

  test('allows admin to access admin-only route', () => {
    const middleware = authorize('admin');
    middleware(makeReq({ role: 'admin' }), mockRes, mockNext);
    expect(mockNext).toHaveBeenCalledTimes(1);
  });

  test('allows teacher to access teacher-or-admin route', () => {
    const middleware = authorize('teacher', 'admin');
    middleware(makeReq({ role: 'teacher' }), mockRes, mockNext);
    expect(mockNext).toHaveBeenCalledTimes(1);
  });

  // ── Deny wrong roles ──────────────────────────────────────
  test('blocks parent from student-only route', () => {
    const middleware = authorize('student');
    middleware(makeReq({ role: 'parent' }), mockRes, mockNext);
    expect(mockNext).not.toHaveBeenCalled();
    expect(mockRes.status).toHaveBeenCalledWith(403);
  });

  test('blocks student from admin-only route', () => {
    const middleware = authorize('admin');
    middleware(makeReq({ role: 'student' }), mockRes, mockNext);
    expect(mockNext).not.toHaveBeenCalled();
    expect(mockRes.status).toHaveBeenCalledWith(403);
  });

  test('blocks teacher from admin-only route', () => {
    const middleware = authorize('admin');
    middleware(makeReq({ role: 'teacher' }), mockRes, mockNext);
    expect(mockNext).not.toHaveBeenCalled();
    expect(mockRes.status).toHaveBeenCalledWith(403);
  });

  test('blocks parent from reading another student\'s data (student role only)', () => {
    // Parent can only access parent routes; student data routes use authorize('student')
    const middleware = authorize('student');
    middleware(makeReq({ role: 'parent' }), mockRes, mockNext);
    expect(mockNext).not.toHaveBeenCalled();
    expect(mockRes.status).toHaveBeenCalledWith(403);
  });

  // ── Unauthenticated ───────────────────────────────────────
  test('returns 401 when no user is attached (unauthenticated)', () => {
    const middleware = authorize('student');
    middleware(makeReq(undefined), mockRes, mockNext);
    expect(mockNext).not.toHaveBeenCalled();
    expect(mockRes.status).toHaveBeenCalledWith(401);
  });

  // ── Multi-role ────────────────────────────────────────────
  test('allows any of multiple permitted roles', () => {
    const middleware = authorize('student', 'teacher', 'parent', 'admin');
    for (const role of ['student', 'teacher', 'parent', 'admin'] as const) {
      jest.clearAllMocks();
      middleware(makeReq({ role }), mockRes, mockNext);
      expect(mockNext).toHaveBeenCalledTimes(1);
    }
  });
});
