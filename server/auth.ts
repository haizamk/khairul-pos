import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { getUserById, getSession, revokeSession } from './db';

const COOKIE_NAME = 'khairul_pos_session';

export interface AuthUserPayload {
  id: string;
  loginId: string;
  name: string;
  role: 'master_admin' | 'admin' | 'cashier';
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUserPayload;
  sessionId?: string;
}

/**
 * Generate cryptographically secure opaque session ID
 */
export function generateSessionId(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Extract session ID from HTTP-only cookie
 */
export function extractSessionId(req: Request): string | null {
  if (req.cookies && req.cookies[COOKIE_NAME]) {
    return req.cookies[COOKIE_NAME];
  }
  return null;
}

/**
 * Set session cookie on response
 */
export function setSessionCookie(res: Response, sessionId: string) {
  res.cookie(COOKIE_NAME, sessionId, {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/',
  });
}

/**
 * Clear session cookie on logout
 */
export function clearSessionCookie(res: Response) {
  res.clearCookie(COOKIE_NAME, { path: '/', sameSite: 'none', secure: true });
}

/**
 * Middleware: Enforce authenticated user via server-side session in MySQL
 */
export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const sessionId = extractSessionId(req);
  if (!sessionId) {
    return res.status(401).json({ success: false, error: 'Sila log masuk terlebih dahulu.' });
  }

  const session = await getSession(sessionId);
  if (!session) {
    clearSessionCookie(res);
    return res.status(401).json({ success: false, error: 'Sesi anda tidak sah atau telah tamat tempoh. Sila log masuk semula.' });
  }

  // Fetch current user status directly from DB to verify user & live role
  const dbUser = await getUserById(session.userId);
  if (!dbUser || dbUser.status === 'inactive' || dbUser.status === 'disabled') {
    clearSessionCookie(res);
    if (session.id) {
      await revokeSession(session.id);
    }
    return res.status(403).json({ success: false, error: 'Akaun anda tidak aktif atau telah dinyahaktifkan.' });
  }

  req.sessionId = session.id;
  req.user = {
    id: dbUser.id,
    loginId: dbUser.loginId,
    name: dbUser.name,
    role: dbUser.role,
  };

  next();
}

/**
 * Middleware: Enforce Admin / Master Admin authorization
 */
export async function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  return requireAuth(req, res, () => {
    if (req.user?.role === 'master_admin' || req.user?.role === 'admin') {
      return next();
    }
    return res.status(403).json({ success: false, error: 'Akses ditolak. Anda memerlukan hak akses Admin.' });
  });
}

/**
 * Middleware: Enforce Master Admin authorization
 */
export async function requireMasterAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  return requireAuth(req, res, () => {
    if (req.user?.role === 'master_admin') {
      return next();
    }
    return res.status(403).json({ success: false, error: 'Akses ditolak. Hanya Master Admin dibenarkan.' });
  });
}

/**
 * Verify plaintext password against bcrypt hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Hash plaintext password
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}
