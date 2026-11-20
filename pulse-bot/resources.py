RESOURCE_LINKS = [
    {
        "category": "Onboarding",
        "title": "RBC Onboarding Guide",
        "url": "https://example.com/rbc-onboarding-guide",
    },
    {
        "category": "Mentorship",
        "title": "Mentorship Matching",
        "url": "https://example.com/mentorship-matching",
    },
    {
        "category": "Wellbeing",
        "title": "Mental Health & EAP Resources",
        "url": "https://example.com/eap-resources",
    },
]


def build_resources_blocks() -> list[dict]:
    lines = [f"• <{link['url']}|{link['title']}>" for link in RESOURCE_LINKS]
    return [
        {
            "type": "header",
            "text": {"type": "plain_text", "text": "Resources"},
        },
        {
            "type": "section",
            "text": {"type": "mrkdwn", "text": "\n".join(lines)},
        },
    ]


def build_resources_context() -> str:
    lines = [
        f"- {link['title']} ({link['category']}): {link['url']}"
        for link in RESOURCE_LINKS
    ]
    return "\n".join(lines)
