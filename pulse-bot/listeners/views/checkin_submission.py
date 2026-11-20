import os
from logging import Logger

from slack_bolt import Ack
from slack_sdk.web.async_client import AsyncWebClient

from feedback import current_iso_week, feedback_store

LOW_PULSE_THRESHOLD = 2


async def handle_checkin_submission(
    ack: Ack,
    body: dict,
    client: AsyncWebClient,
    logger: Logger,
):
    await ack()

    try:
        user_id = body["user"]["id"]
        values = body["view"]["state"]["values"]
        rating = int(
            values["pulse_rating"]["pulse_rating_select"]["selected_option"]["value"]
        )
        topic = values["topic"]["topic_select"]["selected_option"]["value"]
        notes = values["notes"]["notes_input"].get("value") or ""

        iso_week = current_iso_week()
        feedback_store.record_checkin(user_id, iso_week, rating, topic, notes)

        await client.chat_postMessage(
            channel=user_id,
            text="Thanks for checking in! Your response has been recorded. :tada:",
        )

        if rating <= LOW_PULSE_THRESHOLD:
            await alert_hr(client, user_id, rating, topic, notes, logger)
    except Exception:
        logger.exception("Failed to handle check-in submission")


async def alert_hr(
    client: AsyncWebClient,
    user_id: str,
    rating: int,
    topic: str,
    notes: str,
    logger: Logger,
):
    hr_channel_id = os.environ.get("HR_ALERT_CHANNEL_ID")
    if not hr_channel_id:
        logger.warning("HR_ALERT_CHANNEL_ID is not set; skipping low pulse alert")
        return

    text = (
        f":rotating_light: *Low pulse check-in* from <@{user_id}>\n"
        f"*Rating:* {rating}/5\n"
        f"*Topic:* {topic}\n"
        f"*Notes:* {notes or '_none provided_'}"
    )
    await client.chat_postMessage(channel=hr_channel_id, text=text)
