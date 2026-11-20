import os
from logging import Logger

from slack_bolt import Ack
from slack_sdk.web.async_client import AsyncWebClient

from dashboard_client import send_report


async def handle_report_submission(
    ack: Ack,
    body: dict,
    client: AsyncWebClient,
    logger: Logger,
):
    await ack()

    try:
        user_id = body["user"]["id"]
        values = body["view"]["state"]["values"]
        is_anonymous = bool(
            values["anonymous"]["anonymous_checkbox"]["selected_options"]
        )
        category = values["category"]["category_select"]["selected_option"]["value"]
        urgency = values["urgency"]["urgency_select"]["selected_option"]["value"]
        report_text = values["report_text"]["report_input"]["value"]

        await send_report(
            client, user_id, is_anonymous, category, urgency, report_text, logger
        )
        await alert_hr(
            client, user_id, is_anonymous, category, urgency, report_text, logger
        )

        await client.chat_postMessage(
            channel=user_id,
            text="Thanks for the report — it's been sent to HR.",
        )
    except Exception:
        logger.exception("Failed to handle report submission")


async def alert_hr(
    client: AsyncWebClient,
    user_id: str,
    is_anonymous: bool,
    category: str,
    urgency: str,
    report_text: str,
    logger: Logger,
):
    hr_channel_id = os.environ.get("HR_ALERT_CHANNEL_ID")
    if not hr_channel_id:
        logger.warning("HR_ALERT_CHANNEL_ID is not set; skipping report alert")
        return

    submitter = "An anonymous intern" if is_anonymous else f"<@{user_id}>"
    text = (
        f":triangular_flag_on_post: *New report* from {submitter}\n"
        f"*Category:* {category} · *Urgency:* {urgency}\n"
        f"*Details:* {report_text}"
    )
    await client.chat_postMessage(channel=hr_channel_id, text=text)
