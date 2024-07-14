import { Context } from "../../types";

export async function isUserMember(context: Context, user: string) {
  const response = await context.octokit.orgs.listMembers({
    org: context.payload.organization?.login as string,
  });
  const members = response.data.map((member) => member.login);
  return members.includes(user);
}
