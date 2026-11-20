import os
from logging import Logger

from slack_bolt import Ack
from slack_sdk.web.async_client import AsyncWebClient

from dashboard_client import send_checkin
from feedback import current_iso_week, feedback_store
from listeners.support import (
    build_mistreatment_blocks,
    build_support_blocks,
    feels_lost,
    mistreated,
    mistreatment_context,
    stuck_context,
)

from .checkin_builder import ELABORATE_SUFFIX, QUESTIONS, SCALE_MAX, SECTIONS

# Any radar section averaging at or below this (out of 10) alerts HR.
LOW_PULSE_THRESHOLD = 4


def combine_notes(reasons: dict[str, str], extra: str) -> str:
    """One readable block for the dashboard, e.g. 'Role: …\\nVoice: …\\nOther: …'.

    Each line is labelled with its radar section so HR (and the dashboard's AI summary)
    can tell which rating it explains.
    """
    lines = [f"{q.section}: {reasons[q.id]}" for q in QUESTIONS if reasons.get(q.id)]
    if extra:
        lines.append(f"Other: {extra}")
    return "\n".join(lines)


def section_scores(answers: dict[str, int]) -> dict[str, int]:
    """Average each radar section's answers into one whole-number 1–10 score."""
    scores = {}
    for field in SECTIONS:
        vals = [answers[q.id] for q in QUESTIONS if q.field == field]
        scores[field] = max(1, min(SCALE_MAX, round(sum(vals) / len(vals))))
    return scores


async def handle_checkin_submission(
    ack: Ack,
    body: dict,
    client: AsyncWebClient,
    logger: Logger,
):
    await ack()

    try:
        user_id = body["user"]["id"]
        values = body["view"]["state"]["values"]
        answers = {
            q.id: int(values[q.id][f"{q.id}_select"]["selected_option"]["value"])
            for q in QUESTIONS
        }
        ratings = section_scores(answers)
        reasons = {
            q.id: (values.get(f"{q.id}{ELABORATE_SUFFIX}", {}).get("why_input", {}).get("value") or "").strip()
            for q in QUESTIONS
        }
        extra = (values["notes"]["notes_input"].get("value") or "").strip()
        notes = combine_notes(reasons, extra)

        # Overall pulse = average of the sections (kept for reminders + HR alerts)
        rating = round(sum(ratings.values()) / len(ratings))
        feedback_store.record_checkin(user_id, current_iso_week(), rating, "", notes)

        await client.chat_postMessage(
            channel=user_id,
            text="Thanks for checking in! Your response has been recorded. :tada:",
        )

        texts = [*reasons.values(), extra]
        if mistreated(texts):
            await client.chat_postMessage(
                channel=user_id,
                text="I'm sorry you're dealing with that. Here are options to report it or get support.",
                blocks=build_mistreatment_blocks(mistreatment_context(texts)),
            )

        if feels_lost(ratings, texts):
            await client.chat_postMessage(
                channel=user_id,
                text="Some resources and support that might help",
                blocks=build_support_blocks(stuck_context(reasons, extra)),
            )

        await send_checkin(client, user_id, ratings, None, notes, logger)

        if min(ratings.values()) <= LOW_PULSE_THRESHOLD:
            await alert_hr(client, user_id, ratings, answers, reasons, extra, logger)
    except Exception:
        logger.exception("Failed to handle check-in submission")


async def alert_hr(
    client: AsyncWebClient,
    user_id: str,
    ratings: dict[str, int],
    answers: dict[str, int],
    reasons: dict[str, str],
    extra: str,
    logger: Logger,
):
    hr_channel_id = os.environ.get("HR_ALERT_CHANNEL_ID")
    if not hr_channel_id:
        logger.warning("HR_ALERT_CHANNEL_ID is not set; skipping low pulse alert")
        return

    scores = " · ".join(f"{SECTIONS[k]} {v}/{SCALE_MAX}" for k, v in ratings.items())
    lowest = sorted(QUESTIONS, key=lambda q: answers[q.id])[:3]
    low_lines = "\n".join(
        f"• {q.text} *{answers[q.id]}/{SCALE_MAX}*" + (f"\n    _“{reasons[q.id]}”_" if reasons.get(q.id) else "")
        for q in lowest
    )
    text = (
        f":rotating_light: *Low pulse check-in* from <@{user_id}>\n"
        f"*Sections:* {scores}\n"
        f"*Lowest answers:*\n{low_lines}\n"
        f"*Other notes:* {extra or '_none provided_'}"
    )
    await client.chat_postMessage(channel=hr_channel_id, text=text)
