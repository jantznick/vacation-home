import express from 'express';
import bcrypt from 'bcrypt';
import prisma from '../lib/prisma.js';
import {
  consumeLoginToken,
  createLoginToken,
  TOKEN_TTL_MS,
  verifyLoginCode,
  verifyLoginToken,
} from '../lib/loginTokens.js';
import { isResendConfigured, sendMagicLinkEmail } from '../services/email/resend.js';

const router = express.Router();

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const userSelect = {
  id: true,
  email: true,
  createdAt: true,
};

function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

function saveSession(req, res, user) {
  req.session.userId = user.id;
  req.session.email = user.email;

  req.session.save((err) => {
    if (err) {
      console.error('Session save error:', err);
      res.status(500).json({ error: 'Failed to save session' });
      return;
    }

    res.json({ user });
  });
}

async function regenerateSession(req) {
  await new Promise((resolve, reject) => {
    req.session.regenerate((err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

async function findOrCreateUser(email) {
  const normalizedEmail = normalizeEmail(email);

  let user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (!user) {
    user = await prisma.user.create({
      data: { email: normalizedEmail },
    });
  }

  return user;
}

async function completeMagicLogin(req, res, record) {
  const user = await findOrCreateUser(record.email);
  await consumeLoginToken(record);
  await regenerateSession(req);
  saveSession(req, res, {
    id: user.id,
    email: user.email,
    createdAt: user.createdAt,
  });
}

const magicLinkSentResponse = {
  message: 'If that email is valid, we sent a sign-in link and code.',
};

router.post('/register', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Please enter a valid email address' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const normalizedEmail = normalizeEmail(email);

    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        password: hashedPassword,
      },
      select: userSelect,
    });

    await regenerateSession(req);
    saveSession(req, res, user);
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Failed to register user' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const normalizedEmail = normalizeEmail(email);

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user || !user.password) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    await regenerateSession(req);
    saveSession(req, res, {
      id: user.id,
      email: user.email,
      createdAt: user.createdAt,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Failed to login' });
  }
});

router.post('/magic-link/request', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || !emailRegex.test(email)) {
      return res.status(400).json({ error: 'Please enter a valid email address' });
    }

    if (!isResendConfigured() && process.env.NODE_ENV === 'production') {
      return res.status(503).json({ error: 'Email sign-in is not configured' });
    }

    const normalizedEmail = normalizeEmail(email);
    const { rawToken, code } = await createLoginToken(normalizedEmail);

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const loginUrl = `${frontendUrl}/auth/verify?token=${rawToken}`;

    await sendMagicLinkEmail({
      to: normalizedEmail,
      loginUrl,
      code,
      expiresMinutes: Math.round(TOKEN_TTL_MS / 60000),
    });

    if (process.env.NODE_ENV !== 'production') {
      console.log('[magic-link] Dev sign-in for', normalizedEmail);
      console.log('[magic-link] Code:', code);
      console.log('[magic-link] URL:', loginUrl);
    }

    res.json(magicLinkSentResponse);
  } catch (error) {
    console.error('Magic link request error:', error);
    res.status(500).json({ error: 'Failed to send sign-in email' });
  }
});

router.post('/magic-link/verify-code', async (req, res) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({ error: 'Email and code are required' });
    }

    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Please enter a valid email address' });
    }

    const record = await verifyLoginCode(email, code);
    if (!record) {
      return res.status(401).json({ error: 'Invalid or expired code' });
    }

    await completeMagicLogin(req, res, record);
  } catch (error) {
    console.error('Magic link code verify error:', error);
    res.status(500).json({ error: 'Failed to verify code' });
  }
});

router.post('/magic-link/verify-token', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }

    const record = await verifyLoginToken(token);
    if (!record) {
      return res.status(401).json({ error: 'Invalid or expired sign-in link' });
    }

    await completeMagicLogin(req, res, record);
  } catch (error) {
    console.error('Magic link token verify error:', error);
    res.status(500).json({ error: 'Failed to verify sign-in link' });
  }
});

router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to logout' });
    }
    res.clearCookie('connect.sid');
    res.json({ message: 'Logged out successfully' });
  });
});

router.get('/me', async (req, res) => {
  if (!req.session?.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: req.session.userId },
      select: userSelect,
    });

    if (!user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

export default router;
