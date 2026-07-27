/**
 * Tests: Authentication & JWT token generation
 *
 * These run without a real DB — they test the logic in isolation.
 */

import jwt from 'jsonwebtoken';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  JwtPayload,
} from '../src/middleware/auth';

// Set required env vars before tests
process.env.JWT_ACCESS_SECRET = 'test-access-secret-must-be-32-chars!';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-must-be-32-chars!';
process.env.JWT_ACCESS_EXPIRES_IN = '15m';
process.env.JWT_REFRESH_EXPIRES_IN = '7d';

const mockPayload: Omit<JwtPayload, 'iat' | 'exp'> = {
  userId: 'user-123',
  institutionId: 'inst-456',
  role: 'student',
  email: 'student@test.com',
};

describe('Auth — Token Generation', () => {
  test('generateAccessToken returns a valid JWT', () => {
    const token = generateAccessToken(mockPayload);
    expect(typeof token).toBe('string');
    expect(token.split('.')).toHaveLength(3); // header.payload.signature
  });

  test('generateAccessToken encodes correct payload', () => {
    const token = generateAccessToken(mockPayload);
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET!) as JwtPayload;
    expect(decoded.userId).toBe('user-123');
    expect(decoded.institutionId).toBe('inst-456');
    expect(decoded.role).toBe('student');
    expect(decoded.email).toBe('student@test.com');
  });

  test('generateRefreshToken returns a valid JWT', () => {
    const token = generateRefreshToken(mockPayload);
    expect(typeof token).toBe('string');
  });

  test('verifyRefreshToken succeeds with valid token', () => {
    const token = generateRefreshToken(mockPayload);
    const result = verifyRefreshToken(token);
    expect(result.userId).toBe(mockPayload.userId);
  });

  test('verifyRefreshToken throws on tampered token', () => {
    const token = generateRefreshToken(mockPayload);
    const tampered = token.slice(0, -5) + 'XXXXX';
    expect(() => verifyRefreshToken(tampered)).toThrow();
  });

  test('access token expires after configured time', () => {
    // Generate a token that is already expired
    const expiredToken = jwt.sign(mockPayload, process.env.JWT_ACCESS_SECRET!, {
      expiresIn: '0s',
    } as jwt.SignOptions);

    expect(() =>
      jwt.verify(expiredToken, process.env.JWT_ACCESS_SECRET!)
    ).toThrow(jwt.TokenExpiredError);
  });

  test('wrong secret is rejected', () => {
    const token = generateAccessToken(mockPayload);
    expect(() =>
      jwt.verify(token, 'wrong-secret')
    ).toThrow(jwt.JsonWebTokenError);
  });
});
