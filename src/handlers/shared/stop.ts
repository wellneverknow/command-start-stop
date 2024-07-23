import { Context } from "../../types";
import { addCommentToIssue, closePullRequestForAnIssue } from "../../utils/issue";

export async function stop(context: Context, issue: Context["payload"]["issue"], sender: Context["payload"]["sender"], repo: Context["payload"]["repository"]) {
  const { logger } = context;
  const issueNumber = issue.number;

  // is there an assignee?
  const assignees = issue.assignees ?? [];
  // should unassign?
  const userToUnassign = assignees.find((assignee) => assignee?.login.toLowerCase() === sender.login.toLowerCase());

  if (!whoToUnassign) {
    logger.error("You are not assigned to this task", { issueNumber, user: sender.login });
    await addCommentToIssue(context, "```diff\n! You are not assigned to this task.\n```");
    return { output: "You are not assigned to this task" };
  }

  // close PR
  await closePullRequestForAnIssue(context, issueNumber, repo, whoToUnassign.login);

  const {
    name,
    owner: { login },
  } = repo;

  // remove assignee

  await context.octokit.rest.issues.removeAssignees({
    owner: login,
    repo: name,
    issue_number: issueNumber,
    assignees: [sender.login],
  });

  logger.info("You have been unassigned from the task", {
    issueNumber,
    user: sender.login,
  });

  addCommentToIssue(context, "```diff\n+ You have been unassigned from this task.\n```").catch(logger.error);
  return { output: "Task unassigned successfully" };
}
