from logging import Logger

from slack_bolt import Ack
from slack_sdk.web.async_client import AsyncWebClient

from .hr_channel import post_to_hr


async def handle_feedback_submission(ack: Ack, body: dict, client: AsyncWebClient, logger: Logger):
    await ack()
    try:
        user_id = body["user"]["id"]
        values = body["view"]["state"]["values"]
        topic = values["topic"]["topic_select"]["selected_option"]["value"]
        text = values["feedback_text"]["feedback_input"]["value"]
        anonymous = bool(values["anonymous"]["anonymous_checkbox"]["selected_options"])

        sender = "An anonymous intern" if anonymous else f"<@{user_id}>"
        await post_to_hr(
            client,
            f":speech_balloon: *Feedback* from {sender}\n*About:* {topic}\n{text}",
            logger,
            "feedback",
        )
        await client.chat_postMessage(channel=user_id, text="Thanks for the feedback — the team will read it. :pray:")
    except Exception:
        logger.exception("Failed to handle feedback submission")
