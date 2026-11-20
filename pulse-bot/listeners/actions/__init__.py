from slack_bolt.async_app import AsyncApp

from .feedback_buttons import handle_feedback_button
from .home_buttons import handle_open_checkin_button, handle_open_report_button


def register(app: AsyncApp):
    app.action("feedback")(handle_feedback_button)
    app.action("open_checkin_modal")(handle_open_checkin_button)
    app.action("open_report_modal")(handle_open_report_button)
