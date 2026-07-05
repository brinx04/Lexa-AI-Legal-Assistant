# backend/app/core/limiter.py
#
# SlowAPI Rate Limiter — Singleton Module
# ────────────────────────────────────────────────────────────────────────────
# Defined here (not in main.py) to break the circular import that occurs when
# api/documents.py and api/chat.py try to import `limiter` from `app.main`
# while app.main is still being initialized and importing those same modules.
#
# Usage:
#   from app.core.limiter import limiter
# ────────────────────────────────────────────────────────────────────────────

from slowapi import Limiter
from slowapi.util import get_remote_address

# Track users by their IP address.
# In production behind a load balancer, swap get_remote_address for a
# function that reads the X-Forwarded-For header instead.
limiter = Limiter(key_func=get_remote_address)
