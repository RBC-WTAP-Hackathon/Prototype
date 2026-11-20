from resources import build_resources_blocks


def build_app_home_view(
    install_url: str | None = None, is_connected: bool = False
) -> dict:
    """Build the App Home Block Kit view.

    Args:
        install_url: OAuth install URL. When provided, the user has not
            connected and will see a link to install.
        is_connected: When ``True``, the user is connected and the MCP
            status section shows as connected.
    """
    blocks = [
        {
            "type": "header",
            "text": {"type": "plain_text", "text": "Welcome to Intern Pulse :wave:"},
        },
        {
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": (
                    "Submit your weekly check-in, send a report to HR, or ask me "
                    "a question about onboarding, mentorship, or wellbeing resources."
                ),
            },
        },
        {
            "type": "actions",
            "block_id": "intern_pulse_actions",
            "elements": [
                {
                    "type": "button",
                    "action_id": "open_checkin_modal",
                    "text": {"type": "plain_text", "text": "Submit Check-In"},
                    "style": "primary",
                },
                {
                    "type": "button",
                    "action_id": "open_report_modal",
                    "text": {"type": "plain_text", "text": "Submit a Report"},
                },
            ],
        },
        {"type": "divider"},
        *build_resources_blocks(),
        {"type": "divider"},
        {
            "type": "header",
            "text": {
                "type": "plain_text",
                "text": "Hey there :wave: I'm your Slack assistant.",
            },
        },
        {
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": (
                    "I'm here to help! You can ask me questions, have a conversation, "
                    "or ask me to do things in Slack.\n\n"
                    "Send me a *direct message* or *mention me in a channel* to get started."
                ),
            },
        },
        {"type": "divider"},
    ]

    if is_connected:
        blocks.append(
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": "\U0001f7e2 *Slack MCP Server is connected.*",
                },
            }
        )
        blocks.append(
            {
                "type": "context",
                "elements": [
                    {
                        "type": "mrkdwn",
                        "text": "The agent can search messages, read channels, and more.",
                    }
                ],
            }
        )
    elif install_url:
        blocks.append(
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": f"\U0001f534 *Slack MCP Server is disconnected.* <{install_url}|Connect the Slack MCP Server.>",
                },
            }
        )
        blocks.append(
            {
                "type": "context",
                "elements": [
                    {
                        "type": "mrkdwn",
                        "text": "The Slack MCP Server enables the agent to search messages, read channels, and more.",
                    }
                ],
            }
        )
    else:
        blocks.append(
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": "\U0001f534 *Slack MCP Server is disconnected.* <https://github.com/slack-samples/bolt-python-starter-agent/blob/main/claude-agent-sdk/README.md#slack-mcp-server|Learn how to enable the Slack MCP Server.>",
                },
            }
        )
        blocks.append(
            {
                "type": "context",
                "elements": [
                    {
                        "type": "mrkdwn",
                        "text": "The Slack MCP Server enables the agent to search messages, read channels, and more.",
                    }
                ],
            }
        )

    return {
        "type": "home",
        "blocks": blocks,
    }
