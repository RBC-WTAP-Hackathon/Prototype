# Values match the HR dashboard's report categories and urgency levels exactly.
# (emoji, value) — the value is what the dashboard receives, so it stays emoji-free.
CATEGORY_OPTIONS = [
    {"text": {"type": "plain_text", "text": f"{emoji}  {value}", "emoji": True}, "value": value}
    for emoji, value in [
        ("🚫", "Harassment"),
        ("⏰", "Workload"),
        ("💬", "Team Conflict"),
        ("📝", "Other"),
    ]
]

URGENCY_OPTIONS = [
    {"text": {"type": "plain_text", "text": "🟢  Low - whenever HR can", "emoji": True}, "value": "Low"},
    {"text": {"type": "plain_text", "text": "🟡  Medium - this week", "emoji": True}, "value": "Medium"},
    {"text": {"type": "plain_text", "text": "🔴  High - needs attention now", "emoji": True}, "value": "High"},
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
                "block_id": "category",
                "label": {"type": "plain_text", "text": "What's this about?"},
                "element": {
                    "type": "static_select",
                    "action_id": "category_select",
                    "placeholder": {"type": "plain_text", "text": "Pick a category"},
                    "options": CATEGORY_OPTIONS,
                },
            },
            {
                "type": "input",
                "block_id": "urgency",
                "label": {"type": "plain_text", "text": "How urgent is it?"},
                "element": {
                    "type": "static_select",
                    "action_id": "urgency_select",
                    "placeholder": {"type": "plain_text", "text": "Pick urgency"},
                    "initial_option": URGENCY_OPTIONS[1],
                    "options": URGENCY_OPTIONS,
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
