import threading
import time
from dataclasses import dataclass, field
from datetime import UTC, datetime


def current_iso_week(now: datetime | None = None) -> str:
    now = now or datetime.now(UTC)
    iso = now.isocalendar()
    return f"{iso.year}-W{iso.week:02d}"


@dataclass
class CheckinRecord:
    user_id: str
    iso_week: str
    rating: int
    topic: str
    notes: str
    submitted_at: float = field(default_factory=time.time)


class FeedbackStore:
    """Thread-safe in-memory store tracking weekly check-in submissions."""

    def __init__(self):
        self._lock = threading.Lock()
        self._checkins: dict[tuple[str, str], CheckinRecord] = {}

    def record_checkin(
        self, user_id: str, iso_week: str, rating: int, topic: str, notes: str
    ) -> CheckinRecord:
        record = CheckinRecord(
            user_id=user_id,
            iso_week=iso_week,
            rating=rating,
            topic=topic,
            notes=notes,
        )
        with self._lock:
            self._checkins[(user_id, iso_week)] = record
        return record

    def has_checked_in(self, user_id: str, iso_week: str) -> bool:
        with self._lock:
            return (user_id, iso_week) in self._checkins

    def missing_users(self, roster_user_ids: list[str], iso_week: str) -> list[str]:
        with self._lock:
            return [
                user_id
                for user_id in roster_user_ids
                if (user_id, iso_week) not in self._checkins
            ]
