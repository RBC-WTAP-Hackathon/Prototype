"""Weekly check-in modal.

Ten questions, two for each self-reported section of the HR dashboard's
experience radar (Role, RBC, Growth, Voice, Participation in RBC events). On submit,
each section's answers are averaged into the single 1–10 score the dashboard API
expects for that section. Performance is also on the radar but comes from manager
ratings, so it is not asked here.

Slack modals have no slider element, so each rating is a dropdown whose options
are drawn as a filling bar to read like a sliding scale.
"""

from dataclasses import dataclass

SCALE_MAX = 10


@dataclass(frozen=True)
class Question:
    id: str  # Slack block_id
    field: str  # dashboard API field / radar section this feeds
    section: str  # radar label shown to the intern
    text: str
    low: str  # what 1 means
    high: str  # what 10 means


# Dashboard field -> radar section label, in radar order.
SECTIONS = {
    "role_satisfaction": "Role",
    "rbc_satisfaction": "RBC",
    "learning_growth": "Growth",
    "voice_valued": "Voice",
    "participation": "Participation",
}

QUESTIONS = [
    # Role
    Question("role_enjoy", "role_satisfaction", "Role",
             "How satisfied are you with your role and the work you're doing?",
             "not what I expected", "love my work"),
    Question("role_clarity", "role_satisfaction", "Role",
             "How clear are your responsibilities and what's expected of you?",
             "no idea", "crystal clear"),
    # RBC
    Question("rbc_place", "rbc_satisfaction", "RBC",
             "How do you feel about RBC as a place to work?",
             "wouldn't come back", "would happily return"),
    Question("rbc_recommend", "rbc_satisfaction", "RBC",
             "How likely are you to recommend an RBC internship to a friend?",
             "not at all", "definitely"),
    # Growth
    Question("growth_learning", "learning_growth", "Growth",
             "How much are you learning and building new skills?",
             "not learning anything", "growing every day"),
    Question("growth_support", "learning_growth", "Growth",
             "How supported do you feel by your manager or mentor?",
             "on my own", "fully supported"),
    # Voice
    Question("voice_heard", "voice_valued", "Voice",
             "How heard and valued are your ideas and opinions?",
             "never listened to", "always heard"),
    Question("voice_speak_up", "voice_valued", "Voice",
             "How comfortable do you feel speaking up or raising concerns?",
             "not comfortable", "completely comfortable"),
    # Participation in RBC events
    Question("participation_events", "participation", "Participation",
             "How involved were you in RBC events this week (socials, ERGs, info sessions, volunteering)?",
             "didn't join any", "joined everything I could"),
    Question("participation_connected", "participation", "Participation",
             "How connected do you feel to the intern community and the wider RBC network?",
             "on the outside", "really connected"),
]


def scale_label(value: int) -> str:
    """e.g. 7 -> '▰▰▰▰▰▰▰▱▱▱   7 / 10'."""
    return f"{'▰' * value}{'▱' * (SCALE_MAX - value)}   {value} / {SCALE_MAX}"


def _scale_options() -> list[dict]:
    return [
        {"text": {"type": "plain_text", "text": scale_label(v)}, "value": str(v)}
        for v in range(1, SCALE_MAX + 1)
    ]


def _rating_block(number: int, q: Question) -> dict:
    return {
        "type": "input",
        "block_id": q.id,
        "label": {"type": "plain_text", "text": f"{number}. {q.text}"},
        "hint": {"type": "plain_text", "text": f"1 = {q.low}   ·   {SCALE_MAX} = {q.high}"},
        "element": {
            "type": "static_select",
            "action_id": f"{q.id}_select",
            "placeholder": {"type": "plain_text", "text": "Slide to your rating…"},
            "options": _scale_options(),
        },
    }


def _section_header(section: str) -> dict:
    return {"type": "header", "text": {"type": "plain_text", "text": section}}


def build_checkin_modal() -> dict:
    blocks: list[dict] = [
        {
            "type": "context",
            "elements": [
                {
                    "type": "mrkdwn",
                    "text": "10 quick ratings on your *role*, *RBC*, your *growth*, your *voice* "
                    "and your *participation in RBC events*. "
                    "Takes about two minutes.",
                }
            ],
        }
    ]
    current = None
    for number, q in enumerate(QUESTIONS, start=1):
        if q.section != current:
            blocks.append(_section_header(q.section))
            current = q.section
        blocks.append(_rating_block(number, q))

    blocks.append(
        {
            "type": "input",
            "block_id": "notes",
            "optional": True,
            "label": {"type": "plain_text", "text": "What's behind your ratings?"},
            "hint": {
                "type": "plain_text",
                "text": "e.g. what's going well, or what would make your role, growth or voice better",
            },
            "element": {
                "type": "plain_text_input",
                "action_id": "notes_input",
                "multiline": True,
                "max_length": 1500,
                "placeholder": {"type": "plain_text", "text": "Optional, just a few sentences"},
            },
        }
    )

    return {
        "type": "modal",
        "callback_id": "checkin_submission",
        "title": {"type": "plain_text", "text": "Weekly Check-In"},
        "submit": {"type": "plain_text", "text": "Submit"},
        "close": {"type": "plain_text", "text": "Cancel"},
        "blocks": blocks,
    }
