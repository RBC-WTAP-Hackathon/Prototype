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
