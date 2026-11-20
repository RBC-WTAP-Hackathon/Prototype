from listeners.views.app_home_builder import build_app_home_view
from listeners.views.feedback_builder import build_feedback_blocks


def test_build_feedback_blocks():
    blocks = build_feedback_blocks()

    assert len(blocks) > 0
    # The block should contain a feedback action
    block_dict = blocks[0].to_dict()
    action_ids = [e["action_id"] for e in block_dict["elements"]]
    assert "feedback" in action_ids


def test_build_app_home_view_default():
    """Default args (Socket Mode) — shows disconnected status with learn-more link."""
    view = build_app_home_view()

    assert view["type"] == "home"

    # Should have a header and a section
    block_types = [b["type"] for b in view["blocks"]]
    assert "header" in block_types
    assert "section" in block_types

    # Shows MCP status as disconnected with learn-more link
    section_texts = [
        b["text"]["text"] for b in view["blocks"] if b["type"] == "section"
    ]
    mcp_section = next(t for t in section_texts if "Slack MCP Server" in t)
    assert "disconnected" in mcp_section
    assert "Learn how to enable" in mcp_section


def test_build_app_home_view_connect():
    """install_url provided — shows disconnected status with install link."""
    view = build_app_home_view(install_url="https://example.com/slack/install")

    section_texts = [
        b["text"]["text"] for b in view["blocks"] if b["type"] == "section"
    ]
    mcp_section = next(t for t in section_texts if "Slack MCP Server" in t)
    assert "disconnected" in mcp_section
    assert "https://example.com/slack/install" in mcp_section


def test_build_app_home_view_connected():
    """is_connected=True — shows connected status."""
    view = build_app_home_view(is_connected=True)

    section_texts = [
        b["text"]["text"] for b in view["blocks"] if b["type"] == "section"
    ]
    mcp_section = next(t for t in section_texts if "Slack MCP Server" in t)
    assert "connected" in mcp_section


def test_main_menu_has_the_six_options():
    from listeners.views.menu_builder import build_menu_blocks

    action_ids = [b["accessory"]["action_id"] for b in build_menu_blocks()]
    assert action_ids == [
        "open_checkin_modal",
        "open_report_modal",
        "open_feedback_modal",
        "open_resources",
        "open_connect",
        "clear_chat",
    ]


def test_app_home_shows_main_menu():
    view = build_app_home_view()
    action_ids = [b["accessory"]["action_id"] for b in view["blocks"] if "accessory" in b]
    assert "open_resources" in action_ids and "open_connect" in action_ids


def test_resource_and_connect_modals_have_unique_action_ids():
    from listeners.views.menu_builder import build_connect_modal, build_resources_modal

    for view in (build_resources_modal(), build_connect_modal()):
        ids = [b["accessory"]["action_id"] for b in view["blocks"] if "accessory" in b]
        assert len(ids) == len(set(ids))
        assert len(view["blocks"]) <= 100
