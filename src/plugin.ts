import { Context } from "./types/context";
import { userStartStop } from "./handlers/user-start-stop";
import { Env, PluginInputs } from "./types";

import { Octokit } from "@octokit/rest";
import { createClient } from "@supabase/supabase-js";
import { createAdapters } from "./adapters";
import { Database } from "./adapters/supabase/types/database";
import { PrettyLogs } from "./adapters/supabase/pretty-logs";

export async function startStopTask(inputs: PluginInputs, env: Env) {
  const octokit = new Octokit({ auth: inputs.authToken });
  const supabase = createClient<Database>(env.SUPABASE_URL, env.SUPABASE_KEY);

  const context: Context = {
    eventName: inputs.eventName,
    payload: inputs.eventPayload,
    config: inputs.settings,
    octokit,
    env,
    logger: new PrettyLogs(),
    adapters: {} as ReturnType<typeof createAdapters>,
  };

  context.adapters = createAdapters(supabase, context);
  if (context.eventName === "issue_comment.created") {
    await userStartStop(context);
  } else {
    context.logger.error(`Unsupported event: ${context.eventName}`);
  }
}
