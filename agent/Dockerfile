FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Build
COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build

# Health check
HEALTHCHECK --interval=60s --timeout=10s \
  CMD node -e "process.exit(0)" || exit 1

# Run
ENV NODE_ENV=production
CMD ["node", "dist/index.js"]
