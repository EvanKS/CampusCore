import { Router, Request, Response } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import { supabase } from '../db/supabase';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  authenticate,
} from '../middleware/auth';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

export const authRouter = Router();

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// ============================================================
// Zod schemas
// ============================================================
const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  fullName: z.string().min(1).max(200),
  role: z.enum(['student', 'teacher', 'parent', 'admin']),
  institutionSlug: z.string().min(1),
  phone: z.string().optional(),
});

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

const RefreshSchema = z.object({
  refreshToken: z.string(),
});

const GoogleAuthSchema = z.object({
  idToken: z.string(),
  role: z.enum(['student', 'teacher', 'parent', 'admin']).optional(),
  institutionSlug: z.string().optional(),
});

// ============================================================
// Helper: hash a token for DB storage
// ============================================================
function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// ============================================================
// Helper: create and store refresh token, return both tokens
// ============================================================
async function issueTokenPair(user: {
  id: string;
  institutionId: string;
  role: string;
  email: string;
}) {
  const payload = {
    userId: user.id,
    institutionId: user.institutionId,
    role: user.role as 'student' | 'teacher' | 'parent' | 'admin',
    email: user.email,
  };
  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  // Store hashed refresh token
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  await supabase.from('refresh_tokens').insert({
    user_id: user.id,
    token_hash: hashToken(refreshToken),
    expires_at: expiresAt,
  });

  // Update last login
  await supabase.from('users').update({ last_login_at: new Date().toISOString() }).eq('id', user.id);

  return { accessToken, refreshToken };
}

// ============================================================
// POST /api/auth/register
// ============================================================
authRouter.post('/register', asyncHandler(async (req: Request, res: Response) => {
  const body = RegisterSchema.parse(req.body);

  // Look up institution by slug
  const { data: institutions, error: instErr } = await supabase
    .from('institutions')
    .select('id')
    .eq('slug', body.institutionSlug)
    .limit(1);

  if (instErr) throw new AppError(500, 'Database error looking up institution');
  if (!institutions || institutions.length === 0) {
    throw new AppError(404, 'Institution not found');
  }
  const institutionId = institutions[0].id;

  // Check if email already exists
  const { data: existing } = await supabase
    .from('users')
    .select('id')
    .eq('email', body.email)
    .limit(1);

  if (existing && existing.length > 0) {
    throw new AppError(409, 'Email already registered');
  }

  const passwordHash = await bcrypt.hash(body.password, 12);

  const { data: newUsers, error: insertErr } = await supabase
    .from('users')
    .insert({
      institution_id: institutionId,
      email: body.email,
      password_hash: passwordHash,
      role: body.role,
      full_name: body.fullName,
      phone: body.phone ?? null,
    })
    .select('id, role');

  if (insertErr) throw new AppError(500, `Registration failed: ${insertErr.message}`);
  if (!newUsers || newUsers.length === 0) throw new AppError(500, 'User creation failed');

  const user = newUsers[0];
  const tokens = await issueTokenPair({ ...user, institutionId, email: body.email });
  logger.info(`New user registered: ${body.email} (${body.role})`);

  res.status(201).json({
    message: 'Registration successful',
    user: { id: user.id, email: body.email, role: user.role, fullName: body.fullName },
    ...tokens,
  });
}));

// ============================================================
// POST /api/auth/login
// ============================================================
authRouter.post('/login', asyncHandler(async (req: Request, res: Response) => {
  const body = LoginSchema.parse(req.body);

  const { data: users, error } = await supabase
    .from('users')
    .select('id, institution_id, email, password_hash, role, full_name, is_active')
    .eq('email', body.email)
    .limit(1);

  if (error) throw new AppError(500, `Database error: ${error.message}`);

  const user = users?.[0];
  if (!user || !user.password_hash) {
    throw new AppError(401, 'Invalid email or password');
  }
  if (!user.is_active) {
    throw new AppError(403, 'Account is deactivated');
  }

  const valid = await bcrypt.compare(body.password, user.password_hash);
  if (!valid) {
    throw new AppError(401, 'Invalid email or password');
  }

  const tokens = await issueTokenPair({
    id: user.id,
    institutionId: user.institution_id,
    role: user.role,
    email: user.email,
  });

  res.json({
    message: 'Login successful',
    user: { id: user.id, email: user.email, role: user.role, fullName: user.full_name },
    ...tokens,
  });
}));

// ============================================================
// POST /api/auth/google
// ============================================================
authRouter.post('/google', asyncHandler(async (req: Request, res: Response) => {
  const body = GoogleAuthSchema.parse(req.body);

  const ticket = await googleClient.verifyIdToken({
    idToken: body.idToken,
    audience: process.env.GOOGLE_CLIENT_ID,
  });
  const gPayload = ticket.getPayload();
  if (!gPayload || !gPayload.email) {
    throw new AppError(400, 'Invalid Google ID token');
  }

  // Check if user exists by google_id or email
  const { data: users } = await supabase
    .from('users')
    .select('id, institution_id, email, role, full_name, is_active')
    .or(`google_id.eq.${gPayload.sub},email.eq.${gPayload.email}`)
    .limit(1);

  let user = users?.[0];

  if (!user) {
    if (!body.institutionSlug || !body.role) {
      throw new AppError(400, 'institutionSlug and role required for new Google users');
    }
    const { data: insts } = await supabase.from('institutions').select('id').eq('slug', body.institutionSlug).limit(1);
    if (!insts || insts.length === 0) throw new AppError(404, 'Institution not found');

    const { data: newUsers, error: insertErr } = await supabase
      .from('users')
      .insert({
        institution_id: insts[0].id,
        email: gPayload.email,
        google_id: gPayload.sub,
        role: body.role,
        full_name: gPayload.name ?? gPayload.email,
        email_verified: true,
      })
      .select('id, institution_id, email, role, full_name, is_active');

    if (insertErr) throw new AppError(500, `User creation failed: ${insertErr.message}`);
    user = newUsers![0];
  } else {
    await supabase.from('users').update({ google_id: gPayload.sub, email_verified: true }).eq('id', user.id);
    if (!user.is_active) throw new AppError(403, 'Account is deactivated');
  }

  const tokens = await issueTokenPair({
    id: user.id,
    institutionId: user.institution_id,
    role: user.role,
    email: user.email,
  });

  res.json({
    message: 'Google auth successful',
    user: { id: user.id, email: user.email, role: user.role, fullName: user.full_name },
    ...tokens,
  });
}));

// ============================================================
// POST /api/auth/refresh
// ============================================================
authRouter.post('/refresh', asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken } = RefreshSchema.parse(req.body);

  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw new AppError(401, 'Invalid or expired refresh token');
  }

  const tokenHash = hashToken(refreshToken);
  const { data: tokens } = await supabase
    .from('refresh_tokens')
    .select('id, revoked_at')
    .eq('token_hash', tokenHash)
    .gt('expires_at', new Date().toISOString())
    .limit(1);

  if (!tokens || tokens.length === 0 || tokens[0].revoked_at) {
    throw new AppError(401, 'Refresh token revoked or expired');
  }

  // Rotate: revoke old token, issue new pair
  await supabase.from('refresh_tokens').update({ revoked_at: new Date().toISOString() }).eq('token_hash', tokenHash);

  const newTokens = await issueTokenPair({
    id: payload.userId,
    institutionId: payload.institutionId,
    role: payload.role,
    email: payload.email,
  });

  res.json(newTokens);
}));

// ============================================================
// POST /api/auth/logout
// ============================================================
authRouter.post('/logout', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken } = RefreshSchema.parse(req.body);
  const tokenHash = hashToken(refreshToken);
  await supabase.from('refresh_tokens').update({ revoked_at: new Date().toISOString() }).eq('token_hash', tokenHash);
  res.json({ message: 'Logged out successfully' });
}));

// ============================================================
// GET /api/auth/me
// ============================================================
authRouter.get('/me', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const { data: users, error } = await supabase
    .from('users')
    .select('id, email, full_name, role, phone, avatar_url, theme_preference, notification_prefs, institution_id')
    .eq('id', req.user!.userId)
    .limit(1);

  if (error) throw new AppError(500, `Database error: ${error.message}`);
  if (!users || users.length === 0) throw new AppError(404, 'User not found');
  res.json(users[0]);
}));

// ============================================================
// POST /api/auth/change-password
// ============================================================
const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(128),
});

authRouter.post('/change-password', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const { currentPassword, newPassword } = ChangePasswordSchema.parse(req.body);

  const { data: users } = await supabase
    .from('users')
    .select('password_hash')
    .eq('id', req.user!.userId)
    .limit(1);

  if (!users || users.length === 0) throw new AppError(404, 'User not found');

  const valid = await bcrypt.compare(currentPassword, users[0].password_hash);
  if (!valid) throw new AppError(401, 'Current password is incorrect');

  const newHash = await bcrypt.hash(newPassword, 12);
  await supabase.from('users').update({ password_hash: newHash }).eq('id', req.user!.userId);

  res.json({ message: 'Password updated successfully' });
}));
