from logging import Logger

from slack_bolt import Ack
from slack_sdk.web.async_client import AsyncWebClient

from listeners.views.self_id_builder import build_self_id_modal


async def handle_self_id_command(
    ack: Ack,
    body: dict,
    client: AsyncWebClient,
    logger: Logger,
):
    await ack()

    try:
        await client.views_open(trigger_id=body["trigger_id"], view=build_self_id_modal())
    except Exception:
        logger.exception("Failed to open self-ID modal")
