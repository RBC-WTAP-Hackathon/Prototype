from resources import RESOURCE_LINKS, build_resources_blocks, build_resources_context


def test_build_resources_blocks_links_every_resource():
    blocks = build_resources_blocks()

    text = "\n".join(b["text"]["text"] for b in blocks if b["type"] == "section")
    for link in RESOURCE_LINKS:
        assert link["url"] in text
        assert link["title"] in text


def test_build_resources_context_includes_every_resource():
    context = build_resources_context()

    for link in RESOURCE_LINKS:
        assert link["url"] in context
        assert link["title"] in context
