from logging import Logger

from slack_bolt import Ack
from slack_bolt.context.respond.async_respond import AsyncRespond

from agent import run_grounded_qa
from resources import build_resources_blocks


async def handle_onboarding_command(
    ack: Ack, command: dict, respond: AsyncRespond, logger: Logger
):
    await ack()

    question = command.get("text", "").strip()

    try:
        if not question:
            await respond(
                text="Ask me anything about onboarding, mentorship, or wellbeing resources!",
                blocks=build_resources_blocks(),
            )
            return

        answer = await run_grounded_qa(question)
        await respond(text=answer or "I couldn't find an answer to that.")
    except Exception:
        logger.exception("Failed to handle /onboarding command")
        await respond(text=":warning: Something went wrong answering that.")
