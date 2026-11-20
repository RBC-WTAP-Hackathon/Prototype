import os
from logging import Logger

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from slack_bolt.async_app import AsyncApp
from slack_sdk.web.async_client import AsyncWebClient

from feedback import current_iso_week, feedback_store

REMINDER_TEXT = (
    "Hey! Just a friendly nudge — your weekly check-in is still open. "
    "Run `/checkin` whenever you've got a minute, it only takes a second. :wave:"
)


async def get_roster_user_ids(client: AsyncWebClient, logger: Logger) -> list[str]:
    roster_channel_id = os.environ.get("ROSTER_CHANNEL_ID")
    if not roster_channel_id:
        logger.warning("ROSTER_CHANNEL_ID is not set; skipping reminder sweep")
        return []

    try:
        response = await client.conversations_members(channel=roster_channel_id)
        return list(response["members"])
    except Exception:
        logger.exception("Failed to fetch roster channel members")
        return []


async def send_reminders(client: AsyncWebClient, logger: Logger) -> list[str]:
    roster = await get_roster_user_ids(client, logger)
    if not roster:
        return []

    iso_week = current_iso_week()
    missing = feedback_store.missing_users(roster, iso_week)

    for user_id in missing:
        try:
            await client.chat_postMessage(channel=user_id, text=REMINDER_TEXT)
        except Exception:
            logger.exception(f"Failed to send reminder DM to {user_id}")

    return missing


def start_scheduler(app: AsyncApp) -> AsyncIOScheduler:
    scheduler = AsyncIOScheduler()
    scheduler.add_job(
        send_reminders,
        trigger=CronTrigger(
            day_of_week=os.environ.get("REMINDER_WEEKDAY", "mon"),
            hour=os.environ.get("REMINDER_HOUR", "9"),
            minute=os.environ.get("REMINDER_MINUTE", "0"),
        ),
        args=[app.client, app.logger],
    )
    scheduler.start()
    return scheduler
