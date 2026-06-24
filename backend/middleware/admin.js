import prisma from '../lib/prisma.js';
import { isAdminEmail } from '../lib/admin.js';

export async function requireAdmin(req, res, next) {
  if (!req.session?.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: req.session.userId },
      select: { id: true, email: true },
    });

    if (!user || !isAdminEmail(user.email)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    req.adminUser = user;
    next();
  } catch (error) {
    console.error('Admin auth error:', error);
    res.status(500).json({ error: 'Failed to verify admin access' });
  }
}
