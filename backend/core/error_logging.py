"""Error records with traceback locations, without exception or input values."""

import logging
import traceback


def log_unexpected_error(logger: logging.Logger, message: str, error: BaseException) -> None:
    """Log fixed context, frame locations and type without messages or chains.

    Source lines are excluded too: they may contain literal credentials.
    Callers must supply a fixed message, never a payload or str(error).
    """
    locations = [
        f'  File "{frame.f_code.co_filename}", line {line}, in {frame.f_code.co_name}'
        for frame, line in traceback.walk_tb(error.__traceback__)
    ]
    logger.error(
        "%s\nTraceback (locations only):\n%s\nException type: %s",
        message, "\n".join(locations) or "  No traceback available", type(error).__name__,
    )
