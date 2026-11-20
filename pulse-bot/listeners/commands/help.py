from logging import Logger

from slack_bolt import Ack
from slack_bolt.context.respond.async_respond import AsyncRespond

from resources import build_resources_blocks


async def handle_help_command(ack: Ack, respond: AsyncRespond, logger: Logger):
    await ack()

    try:
        await respond(text="Resources for interns", blocks=build_resources_blocks())
    except Exception:
        logger.exception("Failed to respond to /help")
