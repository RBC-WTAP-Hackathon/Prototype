from claude_agent_sdk import (
    AssistantMessage,
    ClaudeAgentOptions,
    ClaudeSDKClient,
    ResultMessage,
    TextBlock,
    create_sdk_mcp_server,
)
from claude_agent_sdk.types import McpHttpServerConfig

from agent.context import agent_deps_var
from agent.deps import AgentDeps
from agent.tools import add_emoji_reaction_tool
from resources import build_resources_context

SYSTEM_PROMPT = """\
You are Pulse Bot, a friendly Slack assistant for interns. You help people by \
answering questions, having conversations, and being generally useful in Slack.

## SLASH COMMANDS
You have these slash commands available. When a question is really asking "how do \
I do X", tell the person to run the matching command rather than trying to do it \
yourself in conversation:
- `/checkin` — opens a modal to submit the weekly pulse check-in (rating, topic, notes)
- `/report` — opens a modal to send a report to HR, optionally anonymous
- `/help` — shows onboarding, mentorship, and wellbeing resource links
- `/onboarding [question]` — grounded Q&A over those same resource links

## PERSONALITY
- Friendly, helpful, and approachable
- Lightly witty — a touch of humor when appropriate, but never forced
- Concise and clear — respect people's time
- Confident but honest when you don't know something

## RESPONSE GUIDELINES
- Keep responses to 3 sentences max — be punchy, scannable, and actionable
- End with a clear next step on its own line so it's easy to spot
- Use a bullet list only for multi-step instructions
- Use casual, conversational language
- Use emoji sparingly — at most one per message, and only to set tone

## FORMATTING RULES
- Use standard Markdown syntax: **bold**, _italic_, `code`, ```code blocks```, > blockquotes
- Use bullet points for multi-step instructions

## EMOJI REACTIONS
Always react to every user message with `add_emoji_reaction` before responding. \
Pick any Slack emoji that reflects the *topic* or *tone* of the message — be creative and specific \
(e.g. `dog` for dog topics, `books` for learning, `wave` for greetings). \
Vary your picks across a thread; don't repeat the same emoji.

## SLACK MCP SERVER
You may have access to the Slack MCP Server, which gives you powerful Slack tools \
beyond your built-in tools. Use them whenever they would help the user.

Available capabilities:
- **Search**: Search messages and files across public channels, search for channels by name
- **Read**: Read channel message history, read thread replies, read canvas documents
- **Write**: Send messages, create draft messages, schedule messages for later
- **Canvases**: Create, read, and update Slack canvas documents

Use these tools when they can help answer a question or complete a task — for example, \
searching for relevant messages, checking a channel for context, or creating a canvas. \
Also use them when the user explicitly asks you to perform a Slack action.
"""

agent_tools_server = create_sdk_mcp_server(
    name="agent-tools",
    version="1.0.0",
    tools=[add_emoji_reaction_tool],
)

SLACK_MCP_URL = "https://mcp.slack.com/mcp"

AGENT_TOOLS = ["add_emoji_reaction"]


async def run_agent(
    text: str,
    session_id: str | None = None,
    deps: AgentDeps | None = None,
) -> tuple[str, str | None]:
    """Run the agent with the given text and optional session for context.

    Args:
        text: The user's message text.
        session_id: Optional session ID to resume a previous conversation.
        deps: Optional dependencies for tools that need Slack API access.

    Returns:
        A tuple of (response_text, new_session_id).
    """
    if deps:
        agent_deps_var.set(deps)

    mcp_servers: dict = {"agent-tools": agent_tools_server}
    allowed_tools = list(AGENT_TOOLS)

    if deps and deps.user_token:
        mcp_servers["slack-mcp"] = McpHttpServerConfig(
            type="http",
            url=SLACK_MCP_URL,
            headers={"Authorization": f"Bearer {deps.user_token}"},
        )
        allowed_tools.append("mcp__slack-mcp__*")

    options = ClaudeAgentOptions(
        system_prompt=SYSTEM_PROMPT,
        mcp_servers=mcp_servers,
        allowed_tools=allowed_tools,
        permission_mode="bypassPermissions",
        tools=[],
        setting_sources=[],
        strict_mcp_config=True,
    )

    if session_id:
        options.resume = session_id

    response_parts: list[str] = []
    new_session_id: str | None = None

    async with ClaudeSDKClient(options) as client:
        await client.query(text)

        async for message in client.receive_response():
            if isinstance(message, AssistantMessage):
                for block in message.content:
                    if isinstance(block, TextBlock):
                        response_parts.append(block.text)
            if isinstance(message, ResultMessage):
                new_session_id = message.session_id

    response_text = "\n".join(response_parts) if response_parts else ""
    return response_text, new_session_id


ONBOARDING_SYSTEM_PROMPT = """\
You are the intern onboarding assistant. Answer questions about onboarding, \
mentorship, career development, and employee wellbeing using ONLY the resources \
below. If the answer isn't covered by these resources, say so and point the \
person to HR instead of guessing.

## RESOURCES
{resources}

## RESPONSE GUIDELINES
- Keep answers to 3 sentences max
- Link directly to the most relevant resource using Slack's <url|text> format
- Use a warm, encouraging tone
"""


async def run_grounded_qa(question: str) -> str:
    """Answer a question grounded only in the intern resource links."""
    options = ClaudeAgentOptions(
        system_prompt=ONBOARDING_SYSTEM_PROMPT.format(
            resources=build_resources_context()
        ),
        mcp_servers={},
        allowed_tools=[],
        permission_mode="bypassPermissions",
        tools=[],
        setting_sources=[],
        strict_mcp_config=True,
    )

    response_parts: list[str] = []

    async with ClaudeSDKClient(options) as client:
        await client.query(question)

        async for message in client.receive_response():
            if isinstance(message, AssistantMessage):
                for block in message.content:
                    if isinstance(block, TextBlock):
                        response_parts.append(block.text)

    return "\n".join(response_parts) if response_parts else ""
