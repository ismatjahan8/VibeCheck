# Railway deployment (VibeCheck)

This repo is designed to deploy as **two Railway services** (backend + frontend) plus **PostgreSQL** (required) and **Redis** (recommended for WebSockets fanout).

References:
- FastAPI guide: `https://docs.railway.com/guides/fastapi`
- React guide: `https://docs.railway.com/guides/react`
- Monorepo guide: `https://docs.railway.com/guides/monorepo`

## 1) Create Railway project
- New Project → Deploy from GitHub Repo → select your `vibecheck` repo

## 2) Add databases
- Add **PostgreSQL** (Railway will provide `DATABASE_URL`)
- Add **Redis** (Railway will provide `REDIS_URL`)

## 3) Backend service (FastAPI)
- Add service from the same GitHub repo
- **Root Directory**: `backend`
- **Start Command**: `python start.py`

### Backend environment variables
Required:
```
DATABASE_URL=<auto set by Railway Postgres>
SECRET_KEY=<generate strong random>
ENVIRONMENT=production
CORS_ORIGINS=https://<your-frontend-domain>
REDIS_URL=<auto set by Railway Redis>   # recommended
```

Optional (Google OAuth):
```
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
# IMPORTANT: set this to your FRONTEND callback route:
GOOGLE_REDIRECT_URI=https://<your-frontend-domain>/oauth/google/callback
```

Optional (SMTP password reset):
```
SMTP_HOST=...
SMTP_PORT=587
SMTP_USERNAME=...
SMTP_PASSWORD=...
SMTP_FROM_EMAIL=...
```

Optional (S3-compatible uploads):
```
S3_BUCKET=...
S3_REGION=...
S3_ENDPOINT_URL=...        # optional (for R2/MinIO/etc.)
S3_PUBLIC_BASE_URL=...     # optional (recommended for clean public URLs)
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
```

## 4) Frontend service (Vite/React)
- Add service from the same GitHub repo
- **Root Directory**: `frontend`
- **Build Command**: `npm ci && npm run build`
- **Start Command**: `npm run start`

### Frontend environment variables
Required:
```
VITE_API_URL=https://<your-backend-domain>
```

Optional:
```
# If omitted, frontend derives ws(s) from VITE_API_URL.
VITE_WS_URL=wss://<your-backend-domain>
```

## Notes
- WebSockets are authenticated using `?token=<jwt>` because browsers can’t reliably set `Authorization` headers for WebSockets.
- CORS must include your exact frontend domain(s) for the REST API to work.

