TOPIC_OPTIONS = [
    {"text": {"type": "plain_text", "text": "Mentorship"}, "value": "mentorship"},
    {"text": {"type": "plain_text", "text": "Onboarding"}, "value": "onboarding"},
    {
        "text": {"type": "plain_text", "text": "Team Dynamics"},
        "value": "team_dynamics",
    },
    {"text": {"type": "plain_text", "text": "Career Dev"}, "value": "career_dev"},
]


def build_checkin_modal() -> dict:
    return {
        "type": "modal",
        "callback_id": "checkin_submission",
        "title": {"type": "plain_text", "text": "Weekly Check-In"},
        "submit": {"type": "plain_text", "text": "Submit"},
        "close": {"type": "plain_text", "text": "Cancel"},
        "blocks": [
            {
                "type": "input",
                "block_id": "pulse_rating",
                "label": {
                    "type": "plain_text",
                    "text": "How are you feeling this week?",
                },
                "element": {
                    "type": "radio_buttons",
                    "action_id": "pulse_rating_select",
                    "options": [
                        {
                            "text": {"type": "plain_text", "text": "1 - Struggling"},
                            "value": "1",
                        },
                        {
                            "text": {
                                "type": "plain_text",
                                "text": "2 - Having a tough time",
                            },
                            "value": "2",
                        },
                        {
                            "text": {"type": "plain_text", "text": "3 - Doing okay"},
                            "value": "3",
                        },
                        {
                            "text": {"type": "plain_text", "text": "4 - Good"},
                            "value": "4",
                        },
                        {
                            "text": {"type": "plain_text", "text": "5 - Thriving"},
                            "value": "5",
                        },
                    ],
                },
            },
            {
                "type": "input",
                "block_id": "topic",
                "label": {
                    "type": "plain_text",
                    "text": "What's this check-in mostly about?",
                },
                "element": {
                    "type": "static_select",
                    "action_id": "topic_select",
                    "placeholder": {"type": "plain_text", "text": "Pick a topic"},
                    "options": TOPIC_OPTIONS,
                },
            },
            {
                "type": "input",
                "block_id": "notes",
                "optional": True,
                "label": {
                    "type": "plain_text",
                    "text": "Anything you'd like to share?",
                },
                "element": {
                    "type": "plain_text_input",
                    "action_id": "notes_input",
                    "multiline": True,
                    "max_length": 1500,
                    "placeholder": {
                        "type": "plain_text",
                        "text": "Totally optional, just a few sentences",
                    },
                },
            },
        ],
    }
