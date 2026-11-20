"""Sends Slack check-ins and reports to the TalentPulse HR dashboard.

Contract: dashboard/README.md ("Slack bot → dashboard contract").
Configure with DASHBOARD_URL (e.g. http://localhost:3000) and BOT_SHARED_SECRET
(must match the dashboard's BOT_SHARED_SECRET). If DASHBOARD_URL is unset, calls
are skipped so the bot still works on its own.
"""

import os
from logging import Logger

import aiohttp
from slack_sdk.web.async_client import AsyncWebClient

TIMEOUT = aiohttp.ClientTimeout(total=15)


def _base_url() -> str | None:
    url = os.environ.get("DASHBOARD_URL", "").strip()
    return url.rstrip("/") or None


async def _post(path: str, payload: dict, logger: Logger) -> bool:
    base = _base_url()
    if not base:
        logger.warning("DASHBOARD_URL is not set; not sending %s to the dashboard", path)
        return False

    headers = {"Content-Type": "application/json"}
    secret = os.environ.get("BOT_SHARED_SECRET")
    if secret:
        headers["x-bot-secret"] = secret

    try:
        async with aiohttp.ClientSession(timeout=TIMEOUT) as session:
            async with session.post(f"{base}{path}", json=payload, headers=headers) as resp:
                if resp.status >= 400:
                    logger.error(
                        "Dashboard %s failed (%s): %s", path, resp.status, await resp.text()
                    )
                    return False
                return True
    except Exception:
        logger.exception("Could not reach the dashboard at %s%s", base, path)
        return False


async def slack_profile(client: AsyncWebClient, user_id: str, logger: Logger) -> dict:
    """Name and title, so the dashboard can register interns it hasn't seen before."""
    try:
        user = (await client.users_info(user=user_id))["user"]
        profile = user.get("profile", {})
        return {
            "name": profile.get("real_name") or user.get("real_name") or user.get("name"),
            "role": profile.get("title") or None,
        }
    except Exception:
        logger.exception("Failed to look up Slack profile for %s", user_id)
        return {}


async def send_checkin(
    client: AsyncWebClient,
    user_id: str,
    ratings: dict[str, int],
    topic: str | None,
    notes: str,
    logger: Logger,
) -> bool:
    payload = {
        "slack_id": user_id,
        **ratings,
        "topic": topic,
        "feedback_text": notes,
        **(await slack_profile(client, user_id, logger)),
    }
    return await _post("/api/checkins", payload, logger)


async def send_self_id(
    client: AsyncWebClient,
    user_id: str,
    gender: str,
    ethnicity: str,
    logger: Logger,
) -> bool:
    payload = {
        "slack_id": user_id,
        "gender": gender,
        "ethnicity": ethnicity,
        **(await slack_profile(client, user_id, logger)),
    }
    return await _post("/api/self-id", payload, logger)


async def send_report(
    client: AsyncWebClient,
    user_id: str,
    is_anonymous: bool,
    category: str,
    urgency: str,
    description: str,
    logger: Logger,
) -> bool:
    payload = {
        "anonymous": is_anonymous,
        "category": category,
        "urgency": urgency,
        "description": description,
    }
    # Anonymous reports never carry the submitter's identity.
    if not is_anonymous:
        payload["slack_id"] = user_id
        payload.update(await slack_profile(client, user_id, logger))
    return await _post("/api/reports", payload, logger)


async def send_inbox_item(
    client: AsyncWebClient,
    user_id: str,
    kind: str,
    topic: str,
    text: str,
    is_anonymous: bool,
    logger: Logger,
) -> bool:
    """Feedback ("feedback") or an intro request ("intro") from the bot menu."""
    payload = {"kind": kind, "anonymous": is_anonymous, "topic": topic, "text": text}
    # Anonymous feedback never carries the sender's identity.
    if not is_anonymous:
        payload["slack_id"] = user_id
        payload.update(await slack_profile(client, user_id, logger))
    return await _post("/api/inbox", payload, logger)
