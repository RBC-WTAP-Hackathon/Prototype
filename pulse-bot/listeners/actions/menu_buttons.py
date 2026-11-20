import asyncio
from logging import Logger

from slack_bolt import Ack
from slack_bolt.context.async_context import AsyncBoltContext
from slack_sdk.web.async_client import AsyncWebClient

from listeners.chat_cleaner import clear_dm_and_confirm
from listeners.support import TECH_WHO
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


async def handle_clear_chat(
    ack: Ack, body: dict, client: AsyncWebClient, context: AsyncBoltContext, logger: Logger
):
    await ack()
    # Deleting many messages can take a while (rate limits); don't block the button.
    task = asyncio.create_task(
        clear_dm_and_confirm(client, body["user"]["id"], context.bot_user_id, context.bot_id, logger)
    )
    _background.add(task)  # keep a reference so the task isn't garbage-collected mid-run
    task.add_done_callback(_background.discard)


_background: set[asyncio.Task] = set()


async def handle_support_connect_technical(ack: Ack, body: dict, client: AsyncWebClient, logger: Logger):
    """From the check-in support DM: open the intro form pre-filled for a technical mentor."""
    await ack()
    context = body["actions"][0].get("value", "")
    why = "" if context == "-" else f"I've been feeling a bit lost: {context}"
    await _open(body, client, build_intro_modal(who=TECH_WHO, why=why), logger, "technical intro")
