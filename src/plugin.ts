import { paginateGraphQL } from "@octokit/plugin-paginate-graphql";
import { Octokit } from "@octokit/rest";
import { createClient } from "@supabase/supabase-js";
import { LogReturn, Logs } from "@ubiquity-dao/ubiquibot-logger";
import { createAdapters } from "./adapters";
import { userPullRequest, userSelfAssign, userStartStop, userUnassigned } from "./handlers/user-start-stop";
import { Context, Env, PluginInputs } from "./types";
import { addCommentToIssue } from "./utils/issue";

export async function startStopTask(inputs: PluginInputs, env: Env) {
  const customOctokit = Octokit.plugin(paginateGraphQL);
  const octokit = new customOctokit({ auth: inputs.authToken });
  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_KEY);

  const context: Context = {
    eventName: inputs.eventName,
    payload: inputs.eventPayload,
    config: inputs.settings,
    octokit,
    env,
    logger: new Logs("info"),
    adapters: {} as ReturnType<typeof createAdapters>,
  };

  context.adapters = createAdapters(supabase, context);

  try {
    switch (context.eventName) {
      case "issue_comment.created":
        return await userStartStop(context);
      case "issues.assigned":
        return await userSelfAssign(context as Context<"issues.assigned">);
      case "pull_request.opened":
        return await userPullRequest(context as Context<"pull_request.opened">);
      case "issues.unassigned":
        return await userUnassigned(context);
      default:
        context.logger.error(`Unsupported event: ${context.eventName}`);
    }
  } catch (err) {
    let errorMessage;
    if (err instanceof LogReturn) {
      errorMessage = err;
    } else if (err instanceof Error) {
      errorMessage = context.logger.error(err.message, { error: err });
    } else {
      errorMessage = context.logger.error("An error occurred", { err });
    }
    await addCommentToIssue(context, `${errorMessage?.logMessage.diff}\n<!--\n${sanitizeMetadata(errorMessage?.metadata)}\n-->`);
  }
}

function sanitizeMetadata(obj: LogReturn["metadata"]): string {
  return JSON.stringify(obj, null, 2).replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/--/g, "&#45;&#45;");
}
