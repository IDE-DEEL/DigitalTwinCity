import hashlib
import hmac

from backend.core.config import settings


def build_access_code_lookup_hash(raw_code: str) -> str:
    return hmac.new(
        settings.SECRET_KEY.encode("utf-8"),
        raw_code.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()
