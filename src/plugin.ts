import { Octokit } from "@octokit/rest";
import { createClient } from "@supabase/supabase-js";
import { LogReturn, Logs } from "@ubiquity-dao/ubiquibot-logger";
import { createAdapters } from "./adapters";
import { userStartStop } from "./handlers/user-start-stop";
import { Context, Env, PluginInputs } from "./types";
import { addCommentToIssue } from "./utils/issue";

export async function startStopTask(inputs: PluginInputs, env: Env) {
  const octokit = new Octokit({ auth: inputs.authToken });
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

  if (context.eventName === "issue_comment.created") {
    try {
      return await userStartStop(context);
    } catch (err) {
      let errorMessage;
      if (err instanceof LogReturn) {
        errorMessage = context.logger.error(`Failed to run comment evaluation. ${err.logMessage?.raw || err}`, { err });
      } else {
        errorMessage = context.logger.error(`Failed to run comment evaluation. ${err}`, { err });
      }

      await addCommentToIssue(context, `${sanitizeDiff(errorMessage?.logMessage.diff)}\n<!--\n${sanitizeMetadata(errorMessage?.metadata)}\n-->`);
    }
  } else {
    context.logger.error(`Unsupported event: ${context.eventName}`);
  }
}

function sanitizeDiff(diff?: LogReturn["logMessage"]["diff"]): string {
  if (!diff) return "";
  // eslint-disable-next-line no-useless-escape
  const backticks = diff.match(/\`\`\`/g);
  if (!backticks) return diff;

  // we need two sets at least and one must be at the end

  if (backticks.length < 2 || backticks.length % 2 !== 0) {
    return diff;
  }

  // does it end with a set of backticks?
  if (diff.endsWith("```") || diff.endsWith("```\n")) {
    return diff;
  }

  return diff + "```";
}

function sanitizeMetadata(obj: LogReturn["metadata"]): string {
  return JSON.stringify(obj, null, 2)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/--/g, "&#45;&#45;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/\\/g, "&#92;")
    .replace(/\//g, "&#47;");
}
