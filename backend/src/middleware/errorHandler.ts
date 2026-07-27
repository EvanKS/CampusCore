import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '../utils/logger';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'Validation error',
      details: err.errors.map(e => ({ path: e.path.join('.'), message: e.message })),
    });
    return;
  }

  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      logger.error(`AppError ${err.statusCode}: ${err.message}`, err.details);
    }
    res.status(err.statusCode).json({
      error: err.message,
      ...(err.details ? { details: err.details } : {}),
    });
    return;
  }

  // Postgres constraint violations
  const pgErr = err as { code?: string; constraint?: string; detail?: string };
  if (pgErr.code === '23505') {
    res.status(409).json({
      error: 'A record with this value already exists',
      constraint: pgErr.constraint,
    });
    return;
  }
  if (pgErr.code === '23503') {
    res.status(400).json({
      error: 'Referenced record does not exist',
      detail: pgErr.detail,
    });
    return;
  }

  logger.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
}

/** Wrap async route handlers so thrown errors propagate to errorHandler. */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    fn(req, res, next).catch(next);
  };
}
