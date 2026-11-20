from .checkin_builder import TOPIC_OPTIONS

REPORT_TOPIC_OPTIONS = TOPIC_OPTIONS + [
    {"text": {"type": "plain_text", "text": "Other"}, "value": "other"},
]


def build_report_modal() -> dict:
    return {
        "type": "modal",
        "callback_id": "report_submission",
        "title": {"type": "plain_text", "text": "Submit a Report"},
        "submit": {"type": "plain_text", "text": "Submit"},
        "close": {"type": "plain_text", "text": "Cancel"},
        "blocks": [
            {
                "type": "input",
                "block_id": "anonymous",
                "optional": True,
                "label": {"type": "plain_text", "text": "Privacy"},
                "element": {
                    "type": "checkboxes",
                    "action_id": "anonymous_checkbox",
                    "options": [
                        {
                            "text": {
                                "type": "plain_text",
                                "text": "Submit anonymously",
                            },
                            "description": {
                                "type": "plain_text",
                                "text": "Your name won't be attached to this report",
                            },
                            "value": "anonymous",
                        }
                    ],
                },
            },
            {
                "type": "input",
                "block_id": "topic",
                "label": {"type": "plain_text", "text": "What's this about?"},
                "element": {
                    "type": "static_select",
                    "action_id": "topic_select",
                    "placeholder": {"type": "plain_text", "text": "Pick a topic"},
                    "options": REPORT_TOPIC_OPTIONS,
                },
            },
            {
                "type": "input",
                "block_id": "report_text",
                "label": {"type": "plain_text", "text": "What's going on?"},
                "element": {
                    "type": "plain_text_input",
                    "action_id": "report_input",
                    "multiline": True,
                    "max_length": 3000,
                    "placeholder": {
                        "type": "plain_text",
                        "text": "Share as much detail as you're comfortable with",
                    },
                },
            },
        ],
    }
