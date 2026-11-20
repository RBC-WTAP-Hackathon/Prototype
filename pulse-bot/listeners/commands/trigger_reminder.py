from logging import Logger

from slack_bolt import Ack
from slack_sdk.web.async_client import AsyncWebClient

from scheduler import send_reminders


async def handle_trigger_reminder_command(
    ack: Ack,
    client: AsyncWebClient,
    logger: Logger,
):
    await ack("Running the reminder sweep now…")

    try:
        missing = await send_reminders(client, logger)
        logger.info(f"Reminder sweep complete. Nudged {len(missing)} user(s).")
    except Exception:
        logger.exception("Failed to run manual reminder sweep")
