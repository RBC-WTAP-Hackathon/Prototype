from listeners.support import SUPPORT_LINKS, TECH_WHO, build_support_blocks, feels_lost, stuck_context
from listeners.views.menu_builder import build_intro_modal

OK = {"role_satisfaction": 7, "rbc_satisfaction": 8, "learning_growth": 7, "voice_valued": 7, "participation": 6}


def test_low_growth_rating_triggers_support():
    assert feels_lost({**OK, "learning_growth": 4}, [])
    assert not feels_lost(OK, [])


def test_lost_language_triggers_support():
    assert feels_lost(OK, ["Honestly I feel pretty lost on the codebase"])
    assert feels_lost(OK, ["", "I don't understand our deployment setup"])
    assert not feels_lost(OK, ["Great week, shipped my first feature"])


def test_stuck_context_prefers_lost_text_then_growth_answer():
    reasons = {"role_enjoy": "Fun team", "growth_learning": "Not much to learn yet"}
    assert stuck_context(reasons, "I'm stuck on the API work") == "I'm stuck on the API work"
    assert stuck_context(reasons, "") == "Not much to learn yet"


def test_support_message_links_learning_and_offers_technical_intro():
    blocks = build_support_blocks("stuck on the API")
    text = "\n".join(b["text"]["text"] for b in blocks if b["type"] == "section")
    for link in SUPPORT_LINKS:
        assert link["url"] in text
    actions = next(b for b in blocks if b["type"] == "actions")["elements"]
    assert actions[0]["action_id"] == "support_connect_technical"
    assert actions[0]["value"] == "stuck on the API"


def test_intro_modal_can_be_prefilled():
    view = build_intro_modal(who=TECH_WHO, why="stuck")
    els = {b["block_id"]: b["element"] for b in view["blocks"]}
    assert els["who"]["initial_value"] == TECH_WHO
    assert els["why"]["initial_value"] == "stuck"
    assert "initial_value" not in build_intro_modal()["blocks"][0]["element"]
