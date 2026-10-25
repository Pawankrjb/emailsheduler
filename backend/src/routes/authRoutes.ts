import { Router, Request, Response } from 'express';
import crypto from 'crypto';

const router = Router();
const sessionSecret = process.env.SESSION_SECRET || 'reachinbox-scheduler-session-secret';

// In-memory / session user store for quick auth & Google OAuth
interface UserSession {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

const activeSessions = new Map<string, UserSession>();

// Seed a default demo ReachInbox user
const demoUser: UserSession = {
  id: 'usr_reachinbox_default',
  name: 'Mitrajit Outreach',
  email: 'growth@reachinbox.ai',
  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=256',
};
activeSessions.set('default_session', demoUser);

function createSessionToken(userId: string): string {
  const signature = crypto
    .createHmac('sha256', sessionSecret)
    .update(userId)
    .digest('hex');
  return `${userId}.${signature}`;
}

function getUserFromSession(req: Request): UserSession | null {
  const cookies = req.headers.cookie?.split(';').map((c) => c.trim()) || [];
  const sessionCookie = cookies.find((c) => c.startsWith('session='));
  const token = sessionCookie?.slice('session='.length);
  const [userId, signature] = token?.split('.') || [];

  if (!userId || !signature) {
    // If no session cookie, return default demo user for seamless testing
    return demoUser;
  }

  const expectedSignature = crypto
    .createHmac('sha256', sessionSecret)
    .update(userId)
    .digest('hex');

  if (signature !== expectedSignature) {
    return demoUser;
  }

  return activeSessions.get(userId) || demoUser;
}

function setSessionCookie(res: Response, userId: string) {
  res.setHeader(
    'Set-Cookie',
    `session=${createSessionToken(userId)}; HttpOnly; Path=/; SameSite=Lax`
  );
}

// 1. Current Session Profile (Used by Home.jsx)
router.get('/profile', (req: Request, res: Response) => {
  const user = getUserFromSession(req);
  return res.json(user);
});

// 2. Google OAuth / One-Click Login
router.post('/auth/google', (req: Request, res: Response) => {
  const { name, email, avatar, googleId } = req.body;

  const user: UserSession = {
    id: `usr_g_${googleId || Date.now()}`,
    name: name || 'ReachInbox Lead',
    email: email || 'user@reachinbox.ai',
    avatar: avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=256',
  };

  activeSessions.set(user.id, user);
  setSessionCookie(res, user.id);

  return res.json({
    message: 'Google login successful',
    user,
  });
});

// 3. Email/Password Login
router.post('/login', (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }

  const user: UserSession = {
    id: `usr_${Date.now()}`,
    name: email.split('@')[0].replace(/[._-]/g, ' '),
    email: email.trim().toLowerCase(),
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=256',
  };

  activeSessions.set(user.id, user);
  setSessionCookie(res, user.id);

  return res.json(user);
});

// 4. Signup
router.post('/signup', (req: Request, res: Response) => {
  const { name, email } = req.body;

  const user: UserSession = {
    id: `usr_${Date.now()}`,
    name: name || 'ReachInbox Member',
    email: (email || 'user@reachinbox.ai').trim().toLowerCase(),
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=256',
  };

  activeSessions.set(user.id, user);
  setSessionCookie(res, user.id);

  return res.status(201).json(user);
});

// 5. Logout
router.post('/logout', (_req: Request, res: Response) => {
  res.setHeader(
    'Set-Cookie',
    'session=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0'
  );
  return res.json({ message: 'Logged out successfully.' });
});

router.post('/user/logout', (_req: Request, res: Response) => {
  res.setHeader(
    'Set-Cookie',
    'session=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0'
  );
  return res.json({ message: 'Logged out successfully.' });
});

export default router;
