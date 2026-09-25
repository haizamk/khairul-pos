import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { getUserByLoginId, getUserById, updateUser } from './db';

const JWT_SECRET = process.env.JWT_SECRET || 'khairul_pos_super_secret_jwt_key_2026';
const COOKIE_NAME = 'khairul_pos_session';

export interface AuthUserPayload {
  id: string;
  loginId: string;
  name: string;
  role: 'master_admin' | 'admin' | 'cashier';
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUserPayload;
}

/**
 * Sign JWT token for user session
 */
export function signAuthToken(user: AuthUserPayload): string {
  return jwt.sign(
    {
      id: user.id,
      loginId: user.loginId,
      name: user.name,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

/**
 * Verify JWT token
 */
export function verifyAuthToken(token: string): AuthUserPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthUserPayload;
    return decoded;
  } catch (err) {
    return null;
  }
}

/**
 * Extract auth token from HTTP-only cookie or Authorization header
 */
export function extractToken(req: Request): string | null {
  // Check cookie first
  if (req.cookies && req.cookies[COOKIE_NAME]) {
    return req.cookies[COOKIE_NAME];
  }
  // Check authorization header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.split('Bearer ')[1].trim();
  }
  return null;
}

/**
 * Set session cookie on response
 */
export function setSessionCookie(res: Response, token: string) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/',
  });
}

/**
 * Clear session cookie on logout
 */
export function clearSessionCookie(res: Response) {
  res.clearCookie(COOKIE_NAME, { path: '/' });
}

/**
 * Middleware: Enforce authenticated user
 */
export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const token = extractToken(req);
  if (!token) {
    return res.status(401).json({ success: false, error: 'Sila log masuk terlebih dahulu.' });
  }

  const payload = verifyAuthToken(token);
  if (!payload) {
    return res.status(401).json({ success: false, error: 'Sesi anda telah tamat tempoh. Sila log masuk semula.' });
  }

  // Fetch current user status from DB to ensure disabled users cannot perform actions
  const dbUser = await getUserById(payload.id);
  if (!dbUser || dbUser.status === 'inactive' || dbUser.status === 'disabled') {
    clearSessionCookie(res);
    return res.status(403).json({ success: false, error: 'Akaun anda tidak aktif atau telah dinyahaktifkan.' });
  }

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
