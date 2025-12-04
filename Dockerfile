# Build Stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including devDependencies for build)
RUN npm ci

# Copy source code
COPY . .

# Build the frontend
RUN npm run build

# Production Stage
FROM node:20-alpine

# Install only production dependencies
# Note: Chromium is removed as Puppeteer is no longer used
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production

# Copy built frontend from builder stage
COPY --from=builder /app/dist ./dist

# Copy backend source code
COPY server.js ./
COPY models ./models
# Copy other necessary backend files/folders if any (e.g., utils, services)
# COPY services ./services 
# COPY utils ./utils

# Create a non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

# Expose the port
EXPOSE 3000

# Start the application
CMD ["node", "server.js"]
