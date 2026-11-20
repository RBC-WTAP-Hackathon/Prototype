from listeners.views.menu_builder import build_menu_blocks


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
            "text": {"type": "plain_text", "text": "Welcome to TalentPulse :wave:"},
        },
        {
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": "Your home for checking in, getting support, and making the most of your internship. "
                "What would you like to do?",
            },
        },
        {"type": "divider"},
        *build_menu_blocks(),
        {"type": "divider"},
        {
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": "Got a question? Send me a *direct message* or *mention me in a channel* and I'll help.",
            },
        },
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
