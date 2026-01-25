from __future__ import annotations

import json

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from jose import JWTError

from app.core.security import decode_token
from app.services.realtime import hub

router = APIRouter(tags=["ws"])


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket) -> None:
    # Browser WebSocket can't set Authorization headers reliably, so we support:
    # - `?token=<jwt>` query param (recommended for web client)
    # - `Authorization: Bearer <jwt>` header (non-browser clients)
    token = websocket.query_params.get("token")
    if not token:
        auth = websocket.headers.get("authorization") or ""
        if auth.lower().startswith("bearer "):
            token = auth.split(" ", 1)[1].strip()
    if not token:
        await websocket.close(code=4401)
        return
    try:
        payload = decode_token(token)
        user_id = int(payload.get("sub", "0"))
    except (JWTError, ValueError):
        await websocket.close(code=4401)
        return

    await hub.connect(user_id, websocket)
    try:
        while True:
            raw = await websocket.receive_text()
            # Client->server events (typing, etc.)
            try:
                event = json.loads(raw)
            except Exception:
                continue

            etype = event.get("type")
            if etype in {"typing:start", "typing:stop"}:
                # Expect conversation_id, recipients (optional)
                await hub.publish(
                    {
                        "type": etype,
                        "conversation_id": event.get("conversation_id"),
                        "user_id": user_id,
                        "recipients": event.get("recipients") or hub.connected_user_ids(),  # MVP
                    }
                )
    except WebSocketDisconnect:
        pass
    finally:
        await hub.disconnect(user_id, websocket)

