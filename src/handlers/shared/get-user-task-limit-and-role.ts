import { Context } from "../../types";

interface MatchingUserProps {
  role: string;
  limit: number;
}

export async function getUserRoleAndTaskLimit(context: Context, user: string): Promise<MatchingUserProps> {
  const orgLogin = context.payload.organization?.login;
  const { config, logger } = context;
  const { maxConcurrentTasks } = config.miscellaneous;

  const smallestTask = Object.entries(maxConcurrentTasks).reduce(
    (minTask, [role, { limit }]) => (limit < minTask.limit ? { role, limit } : minTask),
    { role: "", limit: Infinity } as MatchingUserProps
  );

  try {
    const response = await context.octokit.orgs.getMembershipForUser({
      org: orgLogin as string,
      username: user,
    });

    const matchedTask = Object.entries(maxConcurrentTasks).find(
      ([role]) => role.toLowerCase() === response.data.role.toLowerCase()
    );

    return matchedTask ? { role: matchedTask[0], limit: matchedTask[1].limit } : smallestTask;
    
  } catch (err) {
    logger.error("Could not get user role", { err });
    return smallestTask;
  }
}
