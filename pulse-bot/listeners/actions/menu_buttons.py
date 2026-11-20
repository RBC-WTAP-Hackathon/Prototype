from logging import Logger

from slack_bolt import Ack
from slack_sdk.web.async_client import AsyncWebClient

from listeners.views.menu_builder import (
    build_connect_modal,
    build_feedback_modal,
    build_intro_modal,
    build_resources_modal,
)


async def _open(body: dict, client: AsyncWebClient, view: dict, logger: Logger, what: str):
    try:
        if body.get("view", {}).get("type") == "modal":
            await client.views_push(trigger_id=body["trigger_id"], view=view)  # opened from inside a modal
        else:
            await client.views_open(trigger_id=body["trigger_id"], view=view)
    except Exception:
        logger.exception("Failed to open %s", what)


async def handle_open_feedback(ack: Ack, body: dict, client: AsyncWebClient, logger: Logger):
    await ack()
    await _open(body, client, build_feedback_modal(), logger, "feedback modal")


async def handle_open_resources(ack: Ack, body: dict, client: AsyncWebClient, logger: Logger):
    await ack()
    await _open(body, client, build_resources_modal(), logger, "resources")


async def handle_open_connect(ack: Ack, body: dict, client: AsyncWebClient, logger: Logger):
    await ack()
    await _open(body, client, build_connect_modal(), logger, "connect")


async def handle_open_intro(ack: Ack, body: dict, client: AsyncWebClient, logger: Logger):
    await ack()
    await _open(body, client, build_intro_modal(), logger, "intro request")


async def handle_link_button(ack: Ack):
    """URL buttons open in the browser; Slack still sends an action we must acknowledge."""
    await ack()
