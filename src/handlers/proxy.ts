import { Context, Env, SupportedEventsU } from "../types";
import { userSelfAssign, userStartStop } from "./user-start-stop";

export interface Result {
  status: "ok" | "failed" | "skipped";
  content?: string;
  reason?: string;
}

const callbacks: { [k in SupportedEventsU]: (context: Context, env: Env) => Result | Promise<Result> } = {
  "issue.assigned": userSelfAssign,
  "issue_comment.created": userStartStop,
};

export function proxyCallbacks({ logger }: Context) {
  return new Proxy(callbacks, {
    get(target, prop: SupportedEventsU) {
      if (!(prop in target)) {
        logger.error(`${prop} is not supported, skipping.`);
        return async () => ({ status: "skipped", reason: "unsupported_event" });
      }
      return target[prop].bind(target);
    },
  });
}
