from logging import Logger

from slack_bolt import Ack
from slack_sdk.web.async_client import AsyncWebClient

from dashboard_client import send_self_id

from .self_id_builder import PREFER_NOT


async def handle_self_id_submission(
    ack: Ack,
    body: dict,
    client: AsyncWebClient,
    logger: Logger,
):
    await ack()

    try:
        user_id = body["user"]["id"]
        values = body["view"]["state"]["values"]

        def chosen(block_id: str) -> str:
            opt = values[block_id][f"{block_id}_select"].get("selected_option")
            return opt["value"] if opt else PREFER_NOT

        ok = await send_self_id(client, user_id, chosen("gender"), chosen("ethnicity"), logger)
        await client.chat_postMessage(
            channel=user_id,
            text="Thanks — saved. It's only ever shown to HR as group totals. :lock:"
            if ok
            else "Sorry, I couldn't save that right now. Please try `/self-id` again later.",
        )
    except Exception:
        logger.exception("Failed to handle self-ID submission")
