import { Context } from "../../types";

interface MatchingUserProps {
  role: string;
  limit: number;
}

export async function getUserRole(context: Context, user: string): Promise<MatchingUserProps> {
  const orgLogin = context.payload.organization?.login;
  const { config, logger } = context;
  const { maxConcurrentTasks } = config.miscellaneous;

  try {
    const response = await context.octokit.orgs.getMembershipForUser({
      org: orgLogin as string,
      username: user,
    });

    const matchingUser = maxConcurrentTasks.find(({ role }) => role.toLowerCase() === response.data.role);

    if (matchingUser) {
      //chech if the current user role matches any of those defined in the config
      return matchingUser;
    } else {
      //return the role with the smallest task limit
      return maxConcurrentTasks.reduce((minTask, currentTask) => (currentTask.limit < minTask.limit ? currentTask : minTask));
    }
  } catch (error) {
    logger.error("An error occured", { error: error as Error });
  }
}
