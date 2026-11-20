from logging import Logger

from slack_bolt import Ack
from slack_sdk.web.async_client import AsyncWebClient

from .hr_channel import post_to_hr


async def handle_intro_submission(ack: Ack, body: dict, client: AsyncWebClient, logger: Logger):
    # Close the whole stack (intro form + Connect modal) on submit.
    await ack(response_action="clear")
    try:
        user_id = body["user"]["id"]
        values = body["view"]["state"]["values"]
        who = values["who"]["who_input"]["value"]
        why = values["why"]["why_input"].get("value") or "_not specified_"

        await post_to_hr(
            client,
            f":handshake: *Intro request* from <@{user_id}>\n*Would like to meet:* {who}\n*To talk about:* {why}",
            logger,
            "intro request",
        )
        await client.chat_postMessage(
            channel=user_id,
            text="Got it! The early talent team will reach out to set up your intro. :handshake:",
        )
    except Exception:
        logger.exception("Failed to handle intro request")
