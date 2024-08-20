import { Context } from "../types";
import { addCommentToIssue } from "../utils/issue";
import { Result } from "./proxy";
import { getDeadline } from "./shared/generate-assignment-comment";
import { start } from "./shared/start";
import { stop } from "./shared/stop";

function getUser(payload: Context["payload"]) {
  const { comment, sender } = payload;
  return comment.user?.login ? { login: comment.user.login, id: comment.user.id } : { login: sender.login, id: sender.id };
}

export async function userStartStop(context: Context): Promise<Result> {
  const { payload } = context;
  const { issue, comment, repository } = payload;
  const slashCommand = comment.body.split(" ")[0].replace("/", "");

  const user = getUser(context.payload);

  if (slashCommand === "stop") {
    return await stop(context, issue, user, repository);
  } else if (slashCommand === "start") {
    return await start(context, issue, user);
  }

  return { status: "skipped" };
}

export async function userSelfAssign(context: Context): Promise<Result> {
  const { payload } = context;
  const { issue } = payload;
  const deadline = getDeadline(issue);

  const users = issue.assignees.map((user) => `@${user?.login}`).join(", ");

  await addCommentToIssue(context, `${users} the deadline is at ${deadline}`);
  return { status: "ok" };
}
