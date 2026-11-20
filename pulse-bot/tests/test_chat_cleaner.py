import asyncio
from logging import getLogger

from listeners.chat_cleaner import clear_dm
from thread_context import session_store


class FakeSlack:
    """DM with: user msg, bot msg, user msg with a thread containing a bot reply + user reply."""

    def __init__(self):
        self.deleted = []

    async def conversations_open(self, users):
        return {"channel": {"id": "D1"}}

    async def conversations_history(self, channel, limit, **_):
        return {
            "messages": [
                {"ts": "1", "user": "U1", "text": "hi"},
                {"ts": "2", "user": "UBOT", "bot_id": "B1", "text": "hello"},
                {"ts": "3", "user": "U1", "text": "question", "reply_count": 2},
            ]
        }

    async def conversations_replies(self, channel, ts, limit, **_):
        return {
            "messages": [
                {"ts": "3", "user": "U1"},
                {"ts": "3.1", "user": "UBOT", "bot_id": "B1"},
                {"ts": "3.2", "user": "U1"},
            ]
        }

    async def chat_delete(self, channel, ts):
        self.deleted.append(ts)


def test_clear_dm_deletes_only_bot_messages_including_thread_replies():
    slack = FakeSlack()
    session_store.set_session("D1", "3", "U1", "sess")

    channel, n = asyncio.run(clear_dm(slack, "U1", "UBOT", "B1", getLogger("t")))

    assert channel == "D1"
    assert sorted(slack.deleted) == ["2", "3.1"]
    assert n == 2
    assert session_store.get_session("D1", "3", "U1") is None
