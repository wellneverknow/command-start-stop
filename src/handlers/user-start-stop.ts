import { Context } from "../types";
import { addCommentToIssue } from "../utils/issue";
import { Result } from "./proxy";
import { getDeadline } from "./shared/generate-assignment-comment";
import { start } from "./shared/start";
import { stop } from "./shared/stop";

export async function userStartStop(context: Context): Promise<{ output: string | null }> {
  const { payload } = context;
  const { issue, comment, sender, repository } = payload;
  const slashCommand = comment.body.split(" ")[0].replace("/", "");
  const teamMates = comment.body
    .split("@")
    .slice(1)
    .map((teamMate) => teamMate.split(" ")[0]);

  if (slashCommand === "stop") {
    return await stop(context, issue, sender, repository);
  } else if (slashCommand === "start") {
    return await start(context, issue, sender, teamMates);
  }

  return { output: null };
}

export async function userSelfAssign(context: Context): Promise<Result> {
  const { payload } = context;
  const { issue } = payload;
  const deadline = getDeadline(issue);

  const users = issue.assignees.map((user) => `@${user?.login}`).join(", ");

  await addCommentToIssue(context, `${users} the deadline is at ${deadline}`);
  return { status: "ok" };
}
