import { Context } from "../../types";

export async function getUserRole(context: Context, user: string): Promise<string> {
  const orgLogin = context.payload.organization?.login;

  if (!orgLogin) {
    throw new Error("Organization login not found in context payload.");
  }

  try {
    const response = await context.octokit.orgs.getMembershipForUser({
      org: orgLogin,
      username: user,
    });

    const role = response.data.role;

    if (role === "admin") {
      return "admin";
    } else if (role === "member") {
      return "member";
    } else {
      return "contributor";
    }
  } catch (error) {
    return "contributor";
  }
}
