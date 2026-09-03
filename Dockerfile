# Multi-stage production Dockerfile
FROM node:20-alpine AS base

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install --omit=dev

# Copy application source
COPY . .

# Environment
ENV NODE_ENV=production

CMD ["node", "src/server.js"]
