from slack_bolt.async_app import AsyncApp

from .checkin_submission import handle_checkin_submission
from .report_submission import handle_report_submission


def register(app: AsyncApp):
    app.view("checkin_submission")(handle_checkin_submission)
    app.view("report_submission")(handle_report_submission)
