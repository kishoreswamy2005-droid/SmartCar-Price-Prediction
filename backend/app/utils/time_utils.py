"""Date/time coercion helpers for values read back from MongoDB.

Records written by older versions of the app (or by external writers) may
hold an ISO-8601 *string* instead of a BSON datetime.  MongoDB orders values
by BSON type before comparing them, so a stray string also sorts into the
wrong position among real dates.  Everything that formats or buckets a
timestamp must therefore coerce it first with these helpers instead of
assuming ``datetime``.
"""

from __future__ import annotations

from datetime import datetime, timezone

# Formats seen in legacy documents (``str(datetime)`` and friends).
_FALLBACK_FORMATS = (
    "%Y-%m-%d %H:%M:%S.%f",
    "%Y-%m-%d %H:%M:%S",
    "%Y-%m-%d %H:%M",
    "%Y-%m-%d",
)


def to_datetime(value: object) -> datetime | None:
    """Coerce ``value`` into a ``datetime``; return ``None`` if impossible.

    Accepts an existing ``datetime`` (returned unchanged, aware or not) and
    ISO-8601 / common textual timestamps.  Anything else is ``None`` so
    callers can skip the record instead of crashing on ``.strftime``.
    """
    if isinstance(value, datetime):
        return value

    if not isinstance(value, str):
        return None

    text = value.strip()
    if not text:
        return None

    # ``datetime.fromisoformat`` on Python 3.11 already understands a
    # trailing "Z"; older readers may not, so normalise it anyway.
    candidate = text[:-1] + "+00:00" if text.endswith(("Z", "z")) else text
    try:
        return datetime.fromisoformat(candidate)
    except ValueError:
        pass

    for fmt in _FALLBACK_FORMATS:
        try:
            return datetime.strptime(text, fmt)
        except ValueError:
            continue

    return None


def day_key(value: object) -> str | None:
    """Return ``YYYY-MM-DD`` for ``value`` (UTC date kept as stored)."""
    moment = to_datetime(value)
    if moment is None:
        return None
    if moment.tzinfo is not None:
        moment = moment.astimezone(timezone.utc).replace(tzinfo=None)
    return moment.strftime("%Y-%m-%d")
