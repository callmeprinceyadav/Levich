# Node.js backend Dockerfile
FROM node:20-alpine AS base

WORKDIR /app

# Install dependencies first (better caching)
COPY package.json ./
RUN npm install --production

# Copy source
COPY src ./src

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/health || exit 1

# Start server
CMD ["node", "src/index.js"]
