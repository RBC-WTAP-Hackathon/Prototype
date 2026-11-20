"""Clear a user's DM with the bot.

Slack only lets a bot delete messages *it* posted, so this removes every bot message
(including replies inside threads) and resets the agent's conversation memory. The
user's own messages can't be deleted with a bot token and stay in the DM.
"""

import asyncio
from logging import Logger

from slack_sdk.errors import SlackApiError
from slack_sdk.web.async_client import AsyncWebClient

from thread_context import session_store

CLEAR_PHRASES = {"clear", "clear chat", "clear the chat", "/clear"}


def _from_bot(msg: dict, bot_user_id: str | None, bot_id: str | None) -> bool:
    return bool(
        (bot_user_id and msg.get("user") == bot_user_id) or (bot_id and msg.get("bot_id") == bot_id)
    )


async def _paginate(call, **kwargs) -> list[dict]:
    messages, cursor = [], None
    while True:
        resp = await call(**kwargs, limit=200, **({"cursor": cursor} if cursor else {}))
        messages += resp.get("messages", [])
        cursor = (resp.get("response_metadata") or {}).get("next_cursor")
        if not cursor:
            return messages


async def _delete(client: AsyncWebClient, channel: str, ts: str, logger: Logger) -> bool:
    for _ in range(3):
        try:
            await client.chat_delete(channel=channel, ts=ts)
            return True
        except SlackApiError as e:
            err = e.response.get("error")
            if err == "ratelimited":
                await asyncio.sleep(int(e.response.headers.get("Retry-After", "2")))
                continue
            if err not in ("message_not_found", "cant_delete_message"):
                logger.warning("Couldn't delete message %s: %s", ts, err)
            return False
    return False


async def clear_dm(
    client: AsyncWebClient,
    user_id: str,
    bot_user_id: str | None,
    bot_id: str | None,
    logger: Logger,
) -> tuple[str, int]:
    """Delete the bot's messages in its DM with `user_id`. Returns (dm channel id, count deleted)."""
    channel = (await client.conversations_open(users=user_id))["channel"]["id"]
    history = await _paginate(client.conversations_history, channel=channel)

    to_delete: list[str] = []
    for msg in history:
        if msg.get("reply_count"):
            replies = await _paginate(client.conversations_replies, channel=channel, ts=msg["ts"])
            to_delete += [r["ts"] for r in replies if r["ts"] != msg["ts"] and _from_bot(r, bot_user_id, bot_id)]
        if _from_bot(msg, bot_user_id, bot_id):
            to_delete.append(msg["ts"])

    deleted = 0
    for ts in to_delete:
        deleted += await _delete(client, channel, ts, logger)

    session_store.clear_channel(channel)
    return channel, deleted


async def clear_dm_and_confirm(
    client: AsyncWebClient,
    user_id: str,
    bot_user_id: str | None,
    bot_id: str | None,
    logger: Logger,
) -> None:
    """Clear the DM, then leave a disappearing (ephemeral) confirmation so the chat stays clean."""
    try:
        channel, deleted = await clear_dm(client, user_id, bot_user_id, bot_id, logger)
        await client.chat_postEphemeral(
            channel=channel,
            user=user_id,
            text=f"🧹 Chat cleared: removed {deleted} message{'' if deleted == 1 else 's'} from me and reset "
            "our conversation. Your own messages can't be deleted by a bot, so you may still see those. "
            "Run `/help` for the menu.",
        )
    except Exception:
        logger.exception("Failed to clear DM for %s", user_id)
