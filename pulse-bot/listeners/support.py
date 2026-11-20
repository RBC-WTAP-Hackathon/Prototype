"""Check-in follow-up for interns who seem to be feeling lost.

Triggered when the Growth rating is low or any written answer mentions feeling
lost / confused / stuck. The bot DMs learning resources and offers to connect the
intern with someone who has the technical skills to help (an intro request that
lands on the HR dashboard's Feedback & intro requests card).
"""

import re

from resources import RESOURCE_LINKS

# Growth rating (out of 10) at or below which we offer support.
LOW_GROWTH = 4

LOST = re.compile(
    r"\b(lost|confus\w*|stuck|struggl\w*|overwhelm\w*|out of my depth|no idea|unclear|"
    r"don'?t (know|understand|get)|can'?t figure|need (some )?help|falling behind)\b",
    re.IGNORECASE,
)

TECH_WHO = "Someone with technical skills who can help me get unstuck"

# Learning modules first, then the onboarding guide.
SUPPORT_LINKS = [l for l in RESOURCE_LINKS if l["section"] == "Learning modules"] + [
    l for l in RESOURCE_LINKS if l["category"] == "Onboarding"
]


def feels_lost(ratings: dict[str, int], texts: list[str]) -> bool:
    if ratings.get("learning_growth", 10) <= LOW_GROWTH:
        return True
    return any(LOST.search(t) for t in texts if t)


def stuck_context(reasons: dict[str, str], extra: str) -> str:
    """What they wrote that mentions being lost (or about growth) — pre-fills the intro form."""
    hits = [t for t in [*reasons.values(), extra] if t and LOST.search(t)]
    if not hits and reasons.get("growth_learning"):
        hits = [reasons["growth_learning"]]
    return " ".join(hits)[:900]


def build_support_blocks(context: str) -> list[dict]:
    links = "\n".join(f"• <{l['url']}|{l['title']}> — {l['description']}" for l in SUPPORT_LINKS)
    return [
        {
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": "It sounds like things might feel a bit unclear right now. That's really common, "
                "and you don't have to figure it out alone. :seedling:",
            },
        },
        {"type": "section", "text": {"type": "mrkdwn", "text": f"*📚 Learn at your own pace*\n{links}"}},
        {
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": "*🤝 Talk it through with someone*\nI can ask the early talent team to connect you "
                "with someone who has the technical skills to help you get unstuck.",
            },
        },
        {
            "type": "actions",
            "block_id": "support_actions",
            "elements": [
                {
                    "type": "button",
                    "action_id": "support_connect_technical",
                    "style": "primary",
                    "text": {"type": "plain_text", "text": "🤝 Connect me with someone technical", "emoji": True},
                    "value": context or "-",
                },
                {
                    "type": "button",
                    "action_id": "open_resources",
                    "text": {"type": "plain_text", "text": "📚 All resources", "emoji": True},
                },
            ],
        },
    ]


# ---------------------------------------------------------------------------
# Someone was mean / unkind: offer to report it, plus wellbeing support.
# Matches phrases ("was mean to me", "talked down to") rather than bare words,
# so "I mean…" doesn't trigger it.
# ---------------------------------------------------------------------------

UNKIND = re.compile(
    r"\b(?:was|were|being|been|is|are|so|really|very|super|pretty)\s+"
    r"(?:mean|rude|unkind|nasty|hostile|condescending|disrespectful|dismissive|aggressive)\b"
    r"|\bmean to (?:me|us|her|him|them)\b"
    r"|\b(?:rude|unkind|disrespect\w*|condescend\w*|belittl\w*|humiliat\w*|bull(?:y|ied|ying)|harass\w*|"
    r"insult\w*|toxic|discriminat\w*|racis\w*|sexis\w*|homophob\w*|transphob\w*|picked on)\b"
    r"|\b(?:yell(?:ed|ing)?|scream(?:ed|ing)?|snapped|shout(?:ed|ing)?|swore) at\b"
    r"|\btalk(?:ed|s|ing)? down to\b|\bmade fun of\b|\bmock(?:ed|ing)\b"
    r"|\bmade me (?:feel )?(?:uncomfortable|small|stupid|unwelcome)\b"
    r"|\b(?:excluded|left) me out\b|\binappropriate (?:comment|joke|remark|behaviou?r)s?\b",
    re.IGNORECASE,
)

RESPECT_LINKS = [l for l in RESOURCE_LINKS if l["category"] in ("Respect", "Wellbeing")]
EAP_URL = next((l["url"] for l in RESOURCE_LINKS if l["category"] == "Wellbeing"), None)


def mistreated(texts: list[str]) -> bool:
    return any(UNKIND.search(t) for t in texts if t)


def mistreatment_context(texts: list[str]) -> str:
    """What they wrote about it — pre-fills the report form."""
    return " ".join(t for t in texts if t and UNKIND.search(t))[:1900]


def build_mistreatment_blocks(context: str) -> list[dict]:
    links = "\n".join(f"• <{l['url']}|{l['title']}> — {l['description']}" for l in RESPECT_LINKS)
    buttons = [
        {
            "type": "button",
            "action_id": "support_report",
            "style": "primary",
            "text": {"type": "plain_text", "text": "🚩 Report it", "emoji": True},
            "value": context or "-",
        }
    ]
    if EAP_URL:
        buttons.append(
            {
                "type": "button",
                "action_id": "link_support_eap",
                "text": {"type": "plain_text", "text": "💛 Talk to a counsellor", "emoji": True},
                "url": EAP_URL,
            }
        )
    return [
        {
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": "I'm really sorry you're dealing with that. Nobody should be treated that way at work, "
                "and you don't have to handle it on your own. 💛",
            },
        },
        {
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": "*🚩 Report it*\nIf you'd like, you can tell HR what happened. You can stay anonymous, "
                "and I've started the form with what you wrote so you can edit it.",
            },
        },
        {"type": "section", "text": {"type": "mrkdwn", "text": f"*💛 Get support*\n{links}"}},
        {"type": "actions", "block_id": "mistreatment_actions", "elements": buttons},
        {
            "type": "context",
            "elements": [
                {
                    "type": "mrkdwn",
                    "text": "If you ever feel unsafe, contact your manager or HR right away, or call 911 in an emergency.",
                }
            ],
        },
    ]
