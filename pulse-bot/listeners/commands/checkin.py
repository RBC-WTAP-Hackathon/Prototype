from logging import Logger

from slack_bolt import Ack
from slack_sdk.web.async_client import AsyncWebClient

from listeners.views.checkin_builder import build_checkin_modal


async def handle_checkin_command(
    ack: Ack,
    body: dict,
    client: AsyncWebClient,
    logger: Logger,
):
    await ack()

    try:
        await client.views_open(
            trigger_id=body["trigger_id"], view=build_checkin_modal()
        )
    except Exception:
        logger.exception("Failed to open check-in modal")
