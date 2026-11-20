import re

from slack_bolt.async_app import AsyncApp

from .feedback_buttons import handle_feedback_button
from .home_buttons import handle_open_checkin_button, handle_open_report_button
from .menu_buttons import (
    handle_clear_chat,
    handle_link_button,
    handle_open_connect,
    handle_open_feedback,
    handle_open_intro,
    handle_open_resources,
    handle_support_connect_technical,
    handle_support_report,
)


def register(app: AsyncApp):
    app.action("feedback")(handle_feedback_button)
    app.action("open_checkin_modal")(handle_open_checkin_button)
    app.action("open_report_modal")(handle_open_report_button)
    app.action("open_feedback_modal")(handle_open_feedback)
    app.action("open_resources")(handle_open_resources)
    app.action("open_connect")(handle_open_connect)
    app.action("open_intro_modal")(handle_open_intro)
    app.action("clear_chat")(handle_clear_chat)
    app.action("support_connect_technical")(handle_support_connect_technical)
    app.action("support_report")(handle_support_report)
    app.action(re.compile(r"^link_"))(handle_link_button)
