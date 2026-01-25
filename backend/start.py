from __future__ import annotations

import os
import subprocess
import sys


def _run(cmd: list[str]) -> None:
    p = subprocess.run(cmd, check=False)
    if p.returncode != 0:
        raise SystemExit(p.returncode)


def main() -> None:
    # Run migrations (best-effort). Railway sets DATABASE_URL.
    _run([sys.executable, "-m", "alembic", "upgrade", "head"])

    port = os.getenv("PORT", "8000")
    _run([sys.executable, "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", port])


if __name__ == "__main__":
    main()

