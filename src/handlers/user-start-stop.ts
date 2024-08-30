import { Context } from "../types";
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

  const user = comment.user?.login ? { login: comment.user.login, id: comment.user.id } : { login: sender.login, id: sender.id };

  if (slashCommand === "stop") {
    return await stop(context, issue, user, repository);
  } else if (slashCommand === "start") {
    return await start(context, issue, sender, teamMates);
  }

  return { output: null };
}
