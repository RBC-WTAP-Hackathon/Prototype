from logging import Logger

from slack_bolt import Ack
from slack_sdk.web.async_client import AsyncWebClient

from listeners.views.report_builder import build_report_modal


async def handle_report_command(
    ack: Ack,
    body: dict,
    client: AsyncWebClient,
    logger: Logger,
):
    await ack()

    try:
        await client.views_open(
            trigger_id=body["trigger_id"], view=build_report_modal()
        )
    except Exception:
        logger.exception("Failed to open report modal")
