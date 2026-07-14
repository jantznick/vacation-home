FROM node:20-bookworm-slim

# Chromium for YachtWorld (and other) Puppeteer fetches in production
RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    chromium \
    fonts-liberation \
    ca-certificates \
  && rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV NODE_ENV=production

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY prisma ./prisma
RUN npx prisma generate

COPY . .

EXPOSE 3001

CMD ["sh", "-c", "npx prisma migrate deploy && node server.js"]
