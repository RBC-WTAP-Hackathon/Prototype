from datetime import UTC, datetime

from feedback.store import FeedbackStore, current_iso_week


class TestCurrentIsoWeek:
    def test_formats_year_and_week(self):
        monday = datetime(2026, 11, 16, tzinfo=UTC)
        assert current_iso_week(monday) == "2026-W47"

    def test_same_iso_week_for_any_day_in_it(self):
        monday = datetime(2026, 11, 16, tzinfo=UTC)
        sunday = datetime(2026, 11, 22, tzinfo=UTC)
        assert current_iso_week(monday) == current_iso_week(sunday)


class TestFeedbackStore:
    def test_has_checked_in_reflects_recorded_submission(self):
        store = FeedbackStore()

        assert store.has_checked_in("U1", "2026-W47") is False

        store.record_checkin("U1", "2026-W47", rating=4, topic="onboarding", notes="")

        assert store.has_checked_in("U1", "2026-W47") is True

    def test_checkins_are_scoped_to_their_week(self):
        store = FeedbackStore()
        store.record_checkin("U1", "2026-W47", rating=4, topic="onboarding", notes="")

        assert store.has_checked_in("U1", "2026-W48") is False

    def test_missing_users_excludes_only_those_who_submitted(self):
        store = FeedbackStore()
        store.record_checkin("U1", "2026-W47", rating=5, topic="career_dev", notes="")

        missing = store.missing_users(["U1", "U2", "U3"], "2026-W47")

        assert missing == ["U2", "U3"]
