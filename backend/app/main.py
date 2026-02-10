from __future__ import annotations

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.auth import router as auth_router
from app.api.v1.contacts import router as contacts_router
from app.api.v1.conversations import router as conversations_router
from app.api.v1.messages import router as messages_router
from app.api.v1.search import router as search_router
from app.api.v1.uploads import router as uploads_router
from app.api.v1.users import router as users_router
from app.api.v1.ws import router as ws_router
from app.core.config import settings
from app.services.realtime import hub

# Allowed CORS origins (computed once at startup)
_ALLOWED_ORIGINS: set[str] = set()


class EnsureCORSHeadersMiddleware(BaseHTTPMiddleware):
    """Ensure every response has CORS headers when request has an allowed Origin (e.g. 500/proxy edge cases)."""

    async def dispatch(self, request: Request, call_next) -> Response:
        response = await call_next(request)
        origin = request.headers.get("origin")
        if origin and _ALLOWED_ORIGINS and origin in _ALLOWED_ORIGINS:
            if "access-control-allow-origin" not in response.headers:
                response.headers["access-control-allow-origin"] = origin
                response.headers["vary"] = "Origin"
        return response


def create_app() -> FastAPI:
    app = FastAPI(title="VibeCheck API", version="0.1.0")

    origins = [o.strip() for o in settings.CORS_ORIGINS.split(",") if o.strip()]
    _ALLOWED_ORIGINS.update(origins)
    print(f"[CORS] CORS_ORIGINS={settings.CORS_ORIGINS!r} -> allowed origins={origins}")  # visible in Railway logs

    # Add safeguard first (runs last on response) so error responses still get CORS
    app.add_middleware(EnsureCORSHeadersMiddleware)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins or ["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(auth_router, prefix="/api/v1")
    app.include_router(users_router, prefix="/api/v1")
    app.include_router(contacts_router, prefix="/api/v1")
    app.include_router(conversations_router, prefix="/api/v1")
    app.include_router(messages_router, prefix="/api/v1")
    app.include_router(search_router, prefix="/api/v1")
    app.include_router(uploads_router, prefix="/api/v1")
    app.include_router(ws_router, prefix="/api/v1")

    @app.get("/health")
    def health() -> dict:
        return {"ok": True}

    @app.on_event("startup")
    async def _startup() -> None:
        await hub.startup()

    @app.on_event("shutdown")
    async def _shutdown() -> None:
        await hub.shutdown()

    return app


app = create_app()

