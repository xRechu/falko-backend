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

# Install CA certificates and fetch Amazon RDS global trust bundle (used by Supabase on AWS)
RUN apk add --no-cache ca-certificates curl && \
	update-ca-certificates && \
	curl -fsSL https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem -o /etc/ssl/certs/aws-rds-global-bundle.pem

# Let Node use the additional CA bundle when verifying TLS connections
ENV NODE_EXTRA_CA_CERTS=/etc/ssl/certs/aws-rds-global-bundle.pem

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
CMD ["sh", "-lc", "if [ -n \"$SUPABASE_DB_CA_CERT\" ]; then printf %s \"$SUPABASE_DB_CA_CERT\" > /tmp/supabase-db-ca.crt; export PGSSLROOTCERT=/tmp/supabase-db-ca.crt; export NODE_EXTRA_CA_CERTS=/tmp/supabase-db-ca.crt; fi; export PGSSLMODE=${PGSSLMODE:-verify-full}; ./start.sh"]
