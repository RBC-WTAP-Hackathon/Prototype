from resources import RESOURCE_LINKS, build_resources_blocks, build_resources_context


def test_build_resources_blocks_links_every_resource():
    blocks = build_resources_blocks()

    section = next(b for b in blocks if b["type"] == "section")
    for link in RESOURCE_LINKS:
        assert link["url"] in section["text"]["text"]
        assert link["title"] in section["text"]["text"]


def test_build_resources_context_includes_every_resource():
    context = build_resources_context()

    for link in RESOURCE_LINKS:
        assert link["url"] in context
        assert link["title"] in context
