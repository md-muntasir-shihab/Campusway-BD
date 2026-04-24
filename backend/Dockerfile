# ── Stage 1: Build ────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Install ALL dependencies (including dev) for build
COPY package*.json ./
RUN npm ci --include=dev

# Copy source and compile TypeScript (exclude test files)
COPY tsconfig.json ./
COPY src ./src
RUN rm -rf src/__tests__ && find src -name '*.test.ts' -o -name '*.spec.ts' -o -name '*.prop.test.ts' | xargs rm -f 2>/dev/null; true
RUN npm run build

# ── Stage 2: Production ──────────────────────────────────────────────────────
FROM node:20-alpine

# Install curl for Docker health checks
RUN apk add --no-cache curl

WORKDIR /app

# Create non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Install production dependencies only
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy compiled output from builder
COPY --from=builder /app/dist ./dist

# Switch to non-root user
USER appuser

# Default port (matches .env.example)
EXPOSE 5003

# Health check against the existing /health endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:${PORT:-5003}/health || exit 1

CMD ["node", "dist/server.js"]
