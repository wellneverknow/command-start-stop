import { Context } from "../../types";

interface MatchingUserProps {
  role: string;
  limit: number;
}

export async function getUserRole(context: Context, user: string): Promise<MatchingUserProps> {
  const orgLogin = context.payload.organization?.login;
  const { config, logger } = context;
  const { maxConcurrentTasks } = config.miscellaneous;
  const smallestTask = maxConcurrentTasks.reduce((minTask, currentTask) => (currentTask.limit < minTask.limit ? currentTask : minTask));

  try {
    const response = await context.octokit.orgs.getMembershipForUser({
      org: orgLogin as string,
      username: user,
    });

    return maxConcurrentTasks.find(({ role }) => role.toLowerCase() === response.data.role) ?? smallestTask
  } catch (error) {
    logger.error("An error occured", { error: error as Error });
    return smallestTask
  }
}
