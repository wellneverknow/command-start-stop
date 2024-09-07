import { Context, isContextCommentCreated } from "../types";
import { QUERY_CLOSING_ISSUE_REFERENCES } from "../utils/get-closing-issue-references";
import { addCommentToIssue, getOwnerRepoFromHtmlUrl } from "../utils/issue";
import { HttpStatusCode, Result } from "./result-types";
import { getDeadline } from "./shared/generate-assignment-comment";
import { start } from "./shared/start";
import { stop } from "./shared/stop";

export async function userStartStop(context: Context): Promise<Result> {
  if (!isContextCommentCreated(context)) {
    return { status: HttpStatusCode.NOT_MODIFIED };
  }
  const { payload } = context;
  const { issue, comment, sender, repository } = payload;
  const slashCommand = comment.body.split(" ")[0].replace("/", "");
  const teamMates = comment.body
    .split("@")
    .slice(1)
    .map((teamMate) => teamMate.split(" ")[0]);

  if (slashCommand === "stop") {
    return await stop(context, issue, sender, repository);
  } else if (slashCommand === "start") {
    return await start(context, issue, sender, teamMates);
  }

  return { status: HttpStatusCode.NOT_MODIFIED };
}

export async function userSelfAssign(context: Context<"issues.assigned">): Promise<Result> {
  const { payload } = context;
  const { issue } = payload;
  const deadline = getDeadline(issue);

  if (!deadline) {
    context.logger.debug("Skipping deadline posting message because no deadline has been set.");
    return { status: HttpStatusCode.NOT_MODIFIED };
  }

  const users = issue.assignees.map((user) => `@${user?.login}`).join(", ");

  await addCommentToIssue(context, `${users} the deadline is at ${deadline}`);
  return { status: HttpStatusCode.OK };
}

export async function userPullRequest(context: Context<"pull_request.opened"> | Context<"pull_request.reopened">): Promise<Result> {
  const { payload } = context;
  const { pull_request } = payload;
  const { owner, repo } = getOwnerRepoFromHtmlUrl(pull_request.html_url);
  const linkedIssues = await context.octokit.graphql.paginate(QUERY_CLOSING_ISSUE_REFERENCES, {
    owner,
    repo,
    issue_number: pull_request.id,
  });
  console.log(
    "Pull request",
    {
      owner,
      repo,
      issue_number: pull_request.id,
    },
    linkedIssues
  );
  console.log(pull_request);
  // console.log(pull_request);
  //
  // const deadline = getDeadline(pull_request);
  // console.log(deadline);
  // if (!deadline) {
  //   context.logger.debug("Skipping deadline posting message because no deadline has been set.");
  //   return { status: HttpStatusCode.NOT_MODIFIED };
  // }
  return { status: HttpStatusCode.NOT_MODIFIED };
}
