import crypto from 'crypto';
import prisma from './prisma.js';

const TOKEN_TTL_MS = 15 * 60 * 1000;

function hash(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function generateRawToken() {
  return crypto.randomBytes(32).toString('hex');
}

function generateCode() {
  return String(crypto.randomInt(100000, 1000000));
}

export async function createLoginToken(email) {
  const rawToken = generateRawToken();
  const code = generateCode();
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);

  await prisma.loginToken.deleteMany({
    where: {
      email,
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
  });

  await prisma.loginToken.create({
    data: {
      email,
      tokenHash: hash(rawToken),
      codeHash: hash(code),
      expiresAt,
    },
  });

  return { rawToken, code, expiresAt };
}

async function findValidToken(where) {
  return prisma.loginToken.findFirst({
    where: {
      ...where,
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
  });
}

export async function verifyLoginToken(rawToken) {
  const record = await findValidToken({ tokenHash: hash(rawToken) });
  if (!record) return null;
  return record;
}

export async function verifyLoginCode(email, code) {
  const normalizedEmail = email.trim().toLowerCase();
  const record = await findValidToken({
    email: normalizedEmail,
    codeHash: hash(String(code).trim()),
  });
  if (!record) return null;
  return record;
}

export async function consumeLoginToken(record) {
  await prisma.loginToken.update({
    where: { id: record.id },
    data: { usedAt: new Date() },
  });
}

export { TOKEN_TTL_MS };
