# Multi-stage Dockerfile for Medusa 2.x backend on Fly.io

# -------- Builder stage --------
FROM node:20-alpine AS builder
WORKDIR /app

# Install build deps
RUN apk add --no-cache --update python3 make g++

# Install dependencies
COPY package*.json ./
RUN npm ci --legacy-peer-deps

# Copy source and build
COPY . .
# Build Medusa app to .medusa/server
RUN npm run build

# --- Admin build verification ---
# Ensure production admin build exists (built by `medusa build`)
RUN echo "== Listing .medusa/client (post-build) ==" && ls -l .medusa/client || true && \
	test -f .medusa/client/index.html || (echo "FATAL: brak .medusa/client/index.html po 'npm run build'" && exit 1)

# -------- Runtime stage --------
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Minimal runtime: tylko certyfikaty systemowe (wystarczą do Supabase), bez custom bundle
RUN apk add --no-cache ca-certificates && update-ca-certificates

# Install only production deps
COPY package*.json ./
RUN npm ci --omit=dev --legacy-peer-deps

# Copy built server from builder stage
COPY --from=builder /app/.medusa /app/.medusa
# Copy configs that Medusa reads at runtime (kept outside of build)
COPY --from=builder /app/medusa-config.js /app/medusa-config.js
# Provide optional runtime instrumentation as JS (Node can require it)
COPY --from=builder /app/instrumentation.js /app/instrumentation.js

# Expose Medusa default port
EXPOSE 9000

# Start Medusa (reads .medusa/server)
# Start script ensures admin assets dir exists before launching medusa
COPY --from=builder /app/start.sh /app/start.sh
RUN chmod +x /app/start.sh
CMD ["./start.sh"]
