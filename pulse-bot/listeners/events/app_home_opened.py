import os
from logging import Logger
from urllib.parse import urljoin

from slack_bolt.context.async_context import AsyncBoltContext
from slack_sdk.web.async_client import AsyncWebClient

from listeners.views.app_home_builder import build_app_home_view

SUGGESTED_PROMPTS = [
    {"title": "Complete weekly check-in", "message": "How do I complete my weekly check-in?"},
    {"title": "Report something", "message": "How do I report something to HR?"},
    {"title": "Resources", "message": "What supports, opportunities and learning modules are available?"},
    {"title": "Connect with people at RBC", "message": "How can I meet mentors and other people at RBC?"},
]


async def handle_app_home_opened(
    client: AsyncWebClient, event: dict, context: AsyncBoltContext, logger: Logger
):
    """Handle app_home_opened events.

    Under agent_view, this event fires for both the Home tab and the Messages
    tab (the agent DM). Branch on ``event["tab"]``:
        * ``"messages"`` -- pin suggested prompts to the top of the DM.
        * ``"home"``     -- publish the App Home Block Kit view.
    """
    try:
        if event.get("tab") == "messages":
            await client.assistant_threads_setSuggestedPrompts(
                channel_id=event["channel"],
                title=(
                    "Hi! I'm TalentPulse :wave: Check in, report something, give feedback, "
                    "find resources, or connect with people at RBC. Run `/help` for the menu "
                    "any time, or open my Home tab."
                ),
                prompts=SUGGESTED_PROMPTS,
            )
            # TODO(agent-dm-messages-tab): handle app_context_changed once Bolt supports it
            return

        user_id = context.user_id
        install_url = None
        is_connected = False

        if os.environ.get("SLACK_CLIENT_ID"):
            if context.user_token:
                is_connected = True
            else:
                redirect_uri = os.environ.get("SLACK_REDIRECT_URI", "")
                install_url = urljoin(redirect_uri, "/slack/install")

        view = build_app_home_view(install_url=install_url, is_connected=is_connected)
        await client.views_publish(user_id=user_id, view=view)
    except Exception:
        logger.exception("Failed to handle app_home_opened")
