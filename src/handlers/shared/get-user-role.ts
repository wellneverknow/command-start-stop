import { Context } from "../../types";

export async function getUserRole(context: Context, user: string): Promise<string> {
  const orgLogin = context.payload.organization?.login;
  const { config } = context;
  const { maxConcurrentTasks } = config.miscellaneous;

  if (!orgLogin) {
    throw new Error("Organization login not found in context payload.");
  }

  const response = await context.octokit.orgs.getMembershipForUser({
    org: orgLogin,
    username: user,
  });

  const matchingUser = maxConcurrentTasks.find(({ role }) => role.toLowerCase() === response.data.role);

  if (matchingUser) {
    //chech if the current user role matches any of those defined in the config
    return matchingUser.role;
  } else {
    //return the role with the smallest task limit
    const minLimitTask = maxConcurrentTasks.reduce((minTask, currentTask) => (currentTask.limit < minTask.limit ? currentTask : minTask));
    return minLimitTask.role;
  }
}
