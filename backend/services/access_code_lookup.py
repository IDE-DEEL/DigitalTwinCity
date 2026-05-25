import hashlib
import hmac
import re

from backend.core.config import settings


def normalize_access_code(raw_code: str) -> str:
    alphanumeric_code = re.sub(r"[^a-zA-Z0-9]", "", raw_code).upper()
    if len(alphanumeric_code) != 10:
        return raw_code.strip()

    return f"{alphanumeric_code[:5]}-{alphanumeric_code[5:]}"


def build_access_code_lookup_hash(raw_code: str) -> str:
    return hmac.new(
        settings.SECRET_KEY.encode("utf-8"),
        raw_code.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()
