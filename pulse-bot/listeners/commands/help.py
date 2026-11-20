from logging import Logger

from slack_bolt import Ack
from slack_bolt.context.respond.async_respond import AsyncRespond

from listeners.views.menu_builder import build_menu_blocks


async def handle_help_command(ack: Ack, respond: AsyncRespond, logger: Logger):
    await ack()

    try:
        await respond(
            text="What would you like to do?",
            blocks=[
                {"type": "section", "text": {"type": "mrkdwn", "text": "*What would you like to do?* :wave:"}},
                *build_menu_blocks(),
            ],
        )
    except Exception:
        logger.exception("Failed to respond to /help")
