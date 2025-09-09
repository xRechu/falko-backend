# Deploy Medusa Backend to Fly.io (Staging)

Prerequisites:
- Install flyctl: https://fly.io/docs/hands-on/install-flyctl/
- Fly account and organization
- Supabase Postgres URL (DATABASE_URL with sslmode=require)
- Upstash Redis URL (REDIS_URL=rediss://...)
- Cloudinary URL or separate vars (optional)
- Paynow keys (PAYNOW_API_KEY, PAYNOW_SIGNATURE_KEY) if backend uses them
- Resend API key (RESEND_API_KEY) for emails

Steps:
1) Initialize app (first time only)

```bash
cd falko-backend
fly launch --no-deploy --copy-config --name falko-backend-staging
```

2) Build and deploy

```bash
fly deploy --build-only
fly deploy
```

3) Set secrets (staging)

```bash
fly secrets set \
  DATABASE_URL="postgresql://...sslmode=require" \
  REDIS_URL="rediss://..." \
  JWT_SECRET="<long-random>" \
  COOKIE_SECRET="<long-random>" \
  STORE_CORS="https://your-preview-domain.pages.dev,https://staging.example.com" \
  ADMIN_CORS="https://staging-admin.example.com" \
  AUTH_CORS="https://your-preview-domain.pages.dev" \
  RESEND_API_KEY="re_..." \
  EMAIL_FROM="noreply@your-domain.com" \
  EMAIL_REPLY_TO="support@your-domain.com" \
  FURGONETKA_BASE_URL="https://api.sandbox.furgonetka.pl" \
  FURGONETKA_OAUTH_CLIENT_ID="..." \
  FURGONETKA_OAUTH_CLIENT_SECRET="..." \
  FURGONETKA_WEBHOOK_TOKEN="..." \
  FURGONETKA_AUTH_TOKEN="..." \
  FURGONETKA_COMPANY_ID="..." \
  FURGONETKA_USER_EMAIL="..." \
  MEDUSA_BACKEND_URL="https://<app>.fly.dev"
```

4) Scale and health checks

- fly.toml enables HTTP checks on /health.
- Default min_machines_running=1. To set autoscaling:

```bash
fly scale count 1
fly scale vm shared-cpu-1x --memory 1024
```

5) Logs and troubleshooting

```bash
fly logs -a falko-backend-staging
fly status -a falko-backend-staging
fly open -a falko-backend-staging
```

Notes:
- Keep secrets only in Fly secrets, not in repo.
- For Supabase, ensure sslmode=require and strong password.
- For Furgonetka sandbox, verify OAuth credentials and account permissions.
