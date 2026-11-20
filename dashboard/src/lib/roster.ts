// Known interns from Slack, keyed by Slack user ID. When the bot registers someone the
// dashboard hasn't seen before, these values are used instead of the Slack profile title
// and the "Unassigned" department. Add a line per intern.
import type { User } from "./types";

export const ROSTER: Record<string, Partial<Pick<User, "role" | "department" | "manager_name">>> = {
  U0CK78SJMGX: { role: "Intern", department: "Technology & Operations" }, // Sophia
};
