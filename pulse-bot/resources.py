"""Links shown by the bot's Resources and Connect menus, and given to the Q&A agent.

TODO before launch: replace the example.com placeholders with the real internal links.
"""

# Resources menu, grouped by section (in display order).
RESOURCE_SECTIONS = ["Supports", "Opportunities", "Learning modules"]

RESOURCE_LINKS = [
    # Supports
    {
        "section": "Supports",
        "category": "Wellbeing",
        "title": "Mental Health & EAP Resources",
        "description": "Free, confidential counselling and wellbeing support, 24/7.",
        "url": "https://example.com/eap-resources",
    },
    {
        "section": "Supports",
        "category": "Onboarding",
        "title": "RBC Onboarding Guide",
        "description": "Your first weeks: tools, access, and who to ask for what.",
        "url": "https://example.com/rbc-onboarding-guide",
    },
    {
        "section": "Supports",
        "category": "Respect",
        "title": "Respectful Workplace & Speak Up",
        "description": "RBC's standards for respectful behaviour, and confidential ways to raise concerns.",
        "url": "https://example.com/respectful-workplace",
    },
    {
        "section": "Supports",
        "category": "Accessibility",
        "title": "Workplace Accommodations",
        "description": "Request adjustments to your schedule, tools or workspace.",
        "url": "https://example.com/accommodations",
    },
    # Opportunities
    {
        "section": "Opportunities",
        "category": "Careers",
        "title": "Jobs at RBC Tech",
        "description": "Full-time and return roles across RBC technology.",
        "url": "https://jobs.rbc.com/ca/en/rbctech",
    },
    {
        "section": "Opportunities",
        "category": "Mentorship",
        "title": "Mentorship Matching",
        "description": "Get paired with a mentor outside your team.",
        "url": "https://example.com/mentorship-matching",
    },
    {
        "section": "Opportunities",
        "category": "Events",
        "title": "Intern Events Calendar",
        "description": "Socials, info sessions, ERG events and volunteering.",
        "url": "https://example.com/intern-events",
    },
    # Learning modules
    {
        "section": "Learning modules",
        "category": "Learning",
        "title": "Intern Learning Path",
        "description": "Self-paced modules picked for this summer's cohort.",
        "url": "https://example.com/intern-learning-path",
    },
    {
        "section": "Learning modules",
        "category": "Learning",
        "title": "Technical Skills Library",
        "description": "Courses on cloud, data, AI, and secure development.",
        "url": "https://example.com/tech-skills",
    },
    {
        "section": "Learning modules",
        "category": "Learning",
        "title": "Professional Skills",
        "description": "Presenting, networking, and managing your career.",
        "url": "https://example.com/professional-skills",
    },
]

# Connect menu: ways to meet people at RBC.
CONNECT_LINKS = [
    {
        "title": "Find a mentor",
        "description": "Get matched with someone a few years ahead of you.",
        "url": "https://example.com/mentorship-matching",
    },
    {
        "title": "Employee Resource Groups (ERGs)",
        "description": "Communities for shared identities, interests and allies.",
        "url": "https://example.com/ergs",
    },
    {
        "title": "Intern community channel",
        "description": "Say hi to the rest of this summer's cohort.",
        "url": "https://example.com/intern-community",
    },
    {
        "title": "Upcoming networking events",
        "description": "Coffee chats, speaker series and team socials.",
        "url": "https://example.com/intern-events",
    },
]


def build_resources_blocks() -> list[dict]:
    blocks: list[dict] = [{"type": "header", "text": {"type": "plain_text", "text": "Resources"}}]
    for section in RESOURCE_SECTIONS:
        lines = [
            f"• <{link['url']}|{link['title']}> — {link['description']}"
            for link in RESOURCE_LINKS
            if link["section"] == section
        ]
        blocks.append(
            {"type": "section", "text": {"type": "mrkdwn", "text": f"*{section}*\n" + "\n".join(lines)}}
        )
    return blocks


def build_resources_context() -> str:
    lines = [
        f"- {link['title']} ({link['section']} / {link['category']}): {link['description']} {link['url']}"
        for link in RESOURCE_LINKS
    ]
    lines += [f"- {link['title']} (Connect): {link['description']} {link['url']}" for link in CONNECT_LINKS]
    return "\n".join(lines)
