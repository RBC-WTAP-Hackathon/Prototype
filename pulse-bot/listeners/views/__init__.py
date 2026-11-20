from slack_bolt.async_app import AsyncApp

from .checkin_submission import handle_checkin_submission
from .report_submission import handle_report_submission
from .self_id_submission import handle_self_id_submission
from .feedback_submission import handle_feedback_submission
from .intro_submission import handle_intro_submission


def register(app: AsyncApp):
    app.view("checkin_submission")(handle_checkin_submission)
    app.view("report_submission")(handle_report_submission)
    app.view("self_id_submission")(handle_self_id_submission)
    app.view("feedback_submission")(handle_feedback_submission)
    app.view("intro_submission")(handle_intro_submission)
