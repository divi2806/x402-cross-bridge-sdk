# Standalone Dockerfile for x402 Cross-Chain Facilitator
# This builds the facilitator independently without monorepo dependencies

# Stage 1: Builder
FROM node:20-alpine AS builder
WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package files
COPY package.json tsconfig.json ./

# Install dependencies (will use package.json dependencies)
RUN pnpm install

# Copy source code
COPY src ./src

# Build TypeScript
RUN pnpm build

# Stage 2: Runner
FROM node:20-alpine AS runner
WORKDIR /app

# Set environment to production
ENV NODE_ENV=production

# Install pnpm (needed for production dependencies)
RUN npm install -g pnpm

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 facilitator

# Copy package.json
COPY --chown=facilitator:nodejs package.json ./

# Install production dependencies only
RUN pnpm install --prod

# Copy built files from builder
COPY --from=builder --chown=facilitator:nodejs /app/dist ./dist

# Switch to non-root user
USER facilitator

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1); })"

# Start the application
CMD ["node", "dist/index.js"]
