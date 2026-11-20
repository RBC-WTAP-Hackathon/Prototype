import os
from logging import Logger

from slack_sdk.web.async_client import AsyncWebClient


async def post_to_hr(client: AsyncWebClient, text: str, logger: Logger, what: str) -> bool:
    """Post to the early-talent / HR channel (HR_FEEDBACK_CHANNEL_ID, else HR_ALERT_CHANNEL_ID)."""
    channel = os.environ.get("HR_FEEDBACK_CHANNEL_ID") or os.environ.get("HR_ALERT_CHANNEL_ID")
    if not channel:
        logger.warning("HR_FEEDBACK_CHANNEL_ID / HR_ALERT_CHANNEL_ID not set; %s not delivered: %s", what, text)
        return False
    await client.chat_postMessage(channel=channel, text=text)
    return True
