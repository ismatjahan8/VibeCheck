from __future__ import annotations

import asyncio
import json
from collections import defaultdict
from dataclasses import dataclass
from typing import Any

from fastapi import WebSocket

try:
    from redis.asyncio import Redis
except Exception:  # pragma: no cover
    Redis = None  # type: ignore

from app.core.config import settings


@dataclass
class Connection:
    user_id: int
    websocket: WebSocket


class RealtimeHub:
    def __init__(self) -> None:
        self._connections_by_user: dict[int, set[WebSocket]] = defaultdict(set)
        self._redis: Any | None = None
        self._pubsub_task: asyncio.Task | None = None

    async def startup(self) -> None:
        if settings.REDIS_URL and Redis is not None:
            self._redis = Redis.from_url(settings.REDIS_URL, decode_responses=True)
            self._pubsub_task = asyncio.create_task(self._run_pubsub())

    async def shutdown(self) -> None:
        if self._pubsub_task:
            self._pubsub_task.cancel()
        if self._redis:
            await self._redis.close()

    async def connect(self, user_id: int, websocket: WebSocket) -> None:
        await websocket.accept()
        self._connections_by_user[user_id].add(websocket)
        await self.broadcast_presence(user_id, online=True)

    async def disconnect(self, user_id: int, websocket: WebSocket) -> None:
        self._connections_by_user[user_id].discard(websocket)
        if not self._connections_by_user[user_id]:
            self._connections_by_user.pop(user_id, None)
            await self.broadcast_presence(user_id, online=False)

    async def send_to_user(self, user_id: int, event: dict[str, Any]) -> None:
        payload = json.dumps(event)
        for ws in list(self._connections_by_user.get(user_id, [])):
            try:
                await ws.send_text(payload)
            except Exception:
                self._connections_by_user[user_id].discard(ws)

    async def publish(self, event: dict[str, Any]) -> None:
        if self._redis:
            await self._redis.publish("vibecheck:events", json.dumps(event))
        else:
            await self._dispatch_event(event)

    async def _dispatch_event(self, event: dict[str, Any]) -> None:
        # Minimum routing: allow server to specify recipients, else no-op.
        recipients = event.get("recipients")
        if isinstance(recipients, list):
            for uid in recipients:
                if isinstance(uid, int):
                    await self.send_to_user(uid, event)

    async def _run_pubsub(self) -> None:
        assert self._redis is not None
        pubsub = self._redis.pubsub()
        await pubsub.subscribe("vibecheck:events")
        async for message in pubsub.listen():
            if message.get("type") != "message":
                continue
            data = message.get("data")
            try:
                event = json.loads(data)
            except Exception:
                continue
            await self._dispatch_event(event)

    async def broadcast_presence(self, user_id: int, online: bool) -> None:
        # For MVP, broadcast to everyone currently connected (not just contacts).
        recipients = list(self._connections_by_user.keys())
        await self.publish(
            {
                "type": "presence:update",
                "user_id": user_id,
                "online": online,
                "recipients": recipients,
            }
        )

    def connected_user_ids(self) -> list[int]:
        return list(self._connections_by_user.keys())


hub = RealtimeHub()

