# Health Checks for Medusa Backend on Fly.io

- HTTP GET /health should return 200.
- The Fly.io config (fly.toml) defines http_checks and checks.health hitting /health every 15s.
- Ensure environment variables for DB/Redis are set; otherwise /health may fail under load.

## Local testing

```bash
npm run dev
curl -i http://localhost:9000/health
```

## Fly.io debugging

```bash
fly logs -a falko-backend-staging
fly status -a falko-backend-staging
```
