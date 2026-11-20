from slack_bolt.async_app import AsyncApp

from .checkin import handle_checkin_command
from .help import handle_help_command
from .onboarding import handle_onboarding_command
from .report import handle_report_command
from .trigger_reminder import handle_trigger_reminder_command


def register(app: AsyncApp):
    app.command("/checkin")(handle_checkin_command)
    app.command("/report")(handle_report_command)
    app.command("/help")(handle_help_command)
    app.command("/onboarding")(handle_onboarding_command)
    app.command("/trigger-reminder")(handle_trigger_reminder_command)
