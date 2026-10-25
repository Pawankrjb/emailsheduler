# ─── Stage 1: Build TypeScript ────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ─── Stage 2: Production image ────────────────────────────────────
FROM node:20-alpine

WORKDIR /app

# Only copy production deps + compiled output
COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public

EXPOSE 4000

CMD ["node", "dist/server.js"]
