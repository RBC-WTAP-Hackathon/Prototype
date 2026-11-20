"""Optional, voluntary self-identification modal (/self-id).

Answers only ever appear on the HR dashboard in aggregate, for groups of 5 or more,
and never feed an individual's risk score. Options must match dashboard/src/lib/inclusion.ts.
"""

PREFER_NOT = "Prefer not to say"

GENDER_OPTIONS = ["Woman", "Man", "Non-binary", "Another gender", PREFER_NOT]
ETHNICITY_OPTIONS = [
    "Black",
    "East Asian",
    "Indigenous",
    "Latin American",
    "Middle Eastern / North African",
    "South Asian",
    "Southeast Asian",
    "White",
    "Multiple / mixed",
    "Another ethnicity",
    PREFER_NOT,
]


def _options(values: list[str]) -> list[dict]:
    return [{"text": {"type": "plain_text", "text": v}, "value": v} for v in values]


def _select(block_id: str, label: str, values: list[str]) -> dict:
    opts = _options(values)
    return {
        "type": "input",
        "block_id": block_id,
        "optional": True,
        "label": {"type": "plain_text", "text": label},
        "element": {
            "type": "static_select",
            "action_id": f"{block_id}_select",
            "placeholder": {"type": "plain_text", "text": "Choose one"},
            "initial_option": opts[-1],  # Prefer not to say
            "options": opts,
        },
    }


def build_self_id_modal() -> dict:
    return {
        "type": "modal",
        "callback_id": "self_id_submission",
        "title": {"type": "plain_text", "text": "Self-identification"},
        "submit": {"type": "plain_text", "text": "Save"},
        "close": {"type": "plain_text", "text": "Cancel"},
        "blocks": [
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": "*Completely optional.* This helps HR spot whether any group of interns "
                    "feels excluded or is having a harder time, so they can fix it.\n\n"
                    ":lock: Your answers are only ever shown as group totals for groups of *5 or more* "
                    "people. They're never shown next to your name and never affect your own check-in results. "
                    "You can change or clear them any time by running `/self-id` again.",
                },
            },
            _select("gender", "Gender", GENDER_OPTIONS),
            _select("ethnicity", "Ethnicity", ETHNICITY_OPTIONS),
        ],
    }
