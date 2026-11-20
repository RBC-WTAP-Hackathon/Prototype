"""The bot's main menu and the Resources / Connect / Feedback / Intro views it opens.

The same five options appear in the App Home tab, /help, and the DM welcome.
"""

import hashlib

from resources import CONNECT_LINKS, RESOURCE_LINKS, RESOURCE_SECTIONS

# (action_id, emoji + label, description, button text, primary?)
MENU_OPTIONS = [
    ("open_checkin_modal", "📊  Complete weekly check-in",
     "Two minutes on your role, RBC, growth, voice and participation.", "📊 Check in", True),
    ("open_report_modal", "🚩  Report something",
     "Raise an issue with HR. You can stay anonymous.", "🚩 Report", False),
    ("open_feedback_modal", "💬  Give other feedback",
     "Ideas or comments about the internship program or this bot.", "💬 Give feedback", False),
    ("open_resources", "📚  Resources",
     "Supports, opportunities and learning modules.", "📚 Browse", False),
    ("open_connect", "🤝  Connect with people at RBC",
     "Mentors, ERGs, your intern cohort, or ask for an intro.", "🤝 Connect", False),
    ("clear_chat", "🧹  Clear chat",
     "Delete my messages in our DM and reset our conversation.", "🧹 Clear", False),
]

# Destructive options ask for confirmation before running.
CONFIRM = {
    "clear_chat": {
        "title": {"type": "plain_text", "text": "Clear chat?"},
        "text": {
            "type": "mrkdwn",
            "text": "This deletes every message I've sent you in our DM and resets our conversation. "
            "It can't be undone. Slack doesn't let bots delete *your* messages, so those will stay.",
        },
        "confirm": {"type": "plain_text", "text": "Clear chat"},
        "deny": {"type": "plain_text", "text": "Cancel"},
        "style": "danger",
    }
}


def build_menu_blocks() -> list[dict]:
    blocks: list[dict] = []
    for action_id, label, description, button_text, primary in MENU_OPTIONS:
        button = {
            "type": "button",
            "action_id": action_id,
            "text": {"type": "plain_text", "text": button_text, "emoji": True},
        }
        if primary:
            button["style"] = "primary"
        if action_id in CONFIRM:
            button["confirm"] = CONFIRM[action_id]
        blocks.append(
            {
                "type": "section",
                "block_id": f"menu_{action_id}",
                "text": {"type": "mrkdwn", "text": f"*{label}*\n{description}"},
                "accessory": button,
            }
        )
    return blocks


def _link_button(url: str, text: str = "Open") -> dict:
    # action_id prefix "link_" is acked by a no-op handler (Slack still sends an action for URL buttons).
    return {
        "type": "button",
        "action_id": f"link_{hashlib.md5(url.encode()).hexdigest()[:10]}",
        "text": {"type": "plain_text", "text": text},
        "url": url,
    }


def _link_section(title: str, description: str, url: str) -> dict:
    return {
        "type": "section",
        "text": {"type": "mrkdwn", "text": f"*{title}*\n{description}"},
        "accessory": _link_button(url),
    }


def build_resources_modal() -> dict:
    blocks: list[dict] = []
    for section in RESOURCE_SECTIONS:
        if blocks:
            blocks.append({"type": "divider"})
        blocks.append({"type": "header", "text": {"type": "plain_text", "text": section}})
        for link in RESOURCE_LINKS:
            if link["section"] == section:
                blocks.append(_link_section(link["title"], link["description"], link["url"]))
    return {
        "type": "modal",
        "callback_id": "resources_view",
        "title": {"type": "plain_text", "text": "Resources"},
        "close": {"type": "plain_text", "text": "Done"},
        "blocks": blocks,
    }


def build_connect_modal() -> dict:
    blocks: list[dict] = [
        {
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": "Building your network is one of the best parts of an internship. Here are a few ways in:",
            },
        },
        *[_link_section(c["title"], c["description"], c["url"]) for c in CONNECT_LINKS],
        {"type": "divider"},
        {
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": "*Want to meet someone specific?*\nTell us who and the early talent team will set up an intro.",
            },
            "accessory": {
                "type": "button",
                "action_id": "open_intro_modal",
                "style": "primary",
                "text": {"type": "plain_text", "text": "Request an intro"},
            },
        },
    ]
    return {
        "type": "modal",
        "callback_id": "connect_view",
        "title": {"type": "plain_text", "text": "Connect at RBC"},
        "close": {"type": "plain_text", "text": "Done"},
        "blocks": blocks,
    }


FEEDBACK_TOPICS = ["Internship program", "Events & socials", "This bot", "An idea or suggestion", "Something else"]
FEEDBACK_EMOJI = {
    "Internship program": "🎓",
    "Events & socials": "🎉",
    "This bot": "🤖",
    "An idea or suggestion": "💡",
    "Something else": "💭",
}


def build_feedback_modal() -> dict:
    return {
        "type": "modal",
        "callback_id": "feedback_submission",
        "title": {"type": "plain_text", "text": "Give feedback"},
        "submit": {"type": "plain_text", "text": "Send"},
        "close": {"type": "plain_text", "text": "Cancel"},
        "blocks": [
            {
                "type": "input",
                "block_id": "topic",
                "label": {"type": "plain_text", "text": "What's it about?"},
                "element": {
                    "type": "static_select",
                    "action_id": "topic_select",
                    "placeholder": {"type": "plain_text", "text": "Pick one"},
                    "options": [
                        {"text": {"type": "plain_text", "text": f"{FEEDBACK_EMOJI[t]}  {t}", "emoji": True}, "value": t}
                        for t in FEEDBACK_TOPICS
                    ],
                },
            },
            {
                "type": "input",
                "block_id": "feedback_text",
                "label": {"type": "plain_text", "text": "Your feedback"},
                "element": {
                    "type": "plain_text_input",
                    "action_id": "feedback_input",
                    "multiline": True,
                    "max_length": 2000,
                    "placeholder": {"type": "plain_text", "text": "What's working, what isn't, what you'd change"},
                },
            },
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
                            "text": {"type": "plain_text", "text": "Send anonymously"},
                            "value": "anonymous",
                        }
                    ],
                },
            },
        ],
    }


def build_intro_modal() -> dict:
    return {
        "type": "modal",
        "callback_id": "intro_submission",
        "title": {"type": "plain_text", "text": "Request an intro"},
        "submit": {"type": "plain_text", "text": "Send request"},
        "close": {"type": "plain_text", "text": "Cancel"},
        "blocks": [
            {
                "type": "input",
                "block_id": "who",
                "label": {"type": "plain_text", "text": "Who would you like to meet?"},
                "hint": {"type": "plain_text", "text": "A person, team, role, or area, e.g. \"someone in AI research\""},
                "element": {"type": "plain_text_input", "action_id": "who_input", "max_length": 300},
            },
            {
                "type": "input",
                "block_id": "why",
                "optional": True,
                "label": {"type": "plain_text", "text": "What would you like to talk about?"},
                "element": {
                    "type": "plain_text_input",
                    "action_id": "why_input",
                    "multiline": True,
                    "max_length": 1000,
                },
            },
        ],
    }
