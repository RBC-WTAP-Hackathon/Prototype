// Dashboard → Slack. HR clicks "Send nudge" on a profile; the intern gets a DM from the bot.
// POST /api/nudge { user_id, message? }
import { NextResponse } from "next/server";
import { WebClient } from "@slack/web-api";
import { bad } from "@/lib/auth";
import { getStore } from "@/lib/store";

const DEFAULT_MESSAGE =
  "Hey {first}! 👋 Just checking in — how's your week going? If there's anything on your mind, " +
  "your HR partner would love to grab 15 minutes. You can also use /checkin anytime.";

export async function POST(req: Request) {
  const { user_id, message } = await req.json();
  const store = getStore();
  const user = (await store.snapshot()).users.find((u) => u.id === user_id);
  if (!user) return bad("unknown user_id");

  const text = (message || DEFAULT_MESSAGE).replace("{first}", user.name.split(" ")[0]);
  let delivered = false;
  const token = process.env.SLACK_BOT_TOKEN;
  if (token && !user.slack_id.startsWith("U0DEMO")) {
    const slack = new WebClient(token);
    const dm = await slack.conversations.open({ users: user.slack_id });
    await slack.chat.postMessage({ channel: dm.channel!.id!, text });
    delivered = true;
  } else {
    console.log(`[nudge:simulated] → ${user.name}: ${text}`);
  }

  await store.insertAction({
    user_id,
    type: "nudge",
    note: delivered ? "Slack DM sent" : "Slack DM (simulated)",
    created_at: new Date().toISOString(),
  });
  return NextResponse.json({ ok: true, delivered });
}
