import { Context } from "../types/context";
import { Issue, ISSUE_TYPE } from "../types/payload";
import { getLinkedPullRequests, GetLinkedResults } from "./get-linked-prs";

export function isParentIssue(body: string) {
  const parentPattern = /-\s+\[( |x)\]\s+#\d+/;
  return body.match(parentPattern);
}

export async function getAssignedIssues(context: Context, username: string): Promise<Issue[]> {
  const payload = context.payload;

  try {
    return await context.octokit.paginate(
      context.octokit.issues.listForRepo,
      {
        owner: payload.repository.owner.login,
        repo: payload.repository.name,
        state: ISSUE_TYPE.OPEN,
        per_page: 100,
      },
      ({ data: issues }) => issues.filter((issue) => !issue.pull_request && issue.assignee && issue.assignee.login === username)
    );
  } catch (err: unknown) {
    context.logger.error("Fetching assigned issues failed!", { error: err as Error });
    return [];
  }
}

export async function addCommentToIssue(context: Context, message: string | null) {
  const comment = message as string;

  const { payload } = context;

  const issueNumber = payload.issue.number;
  try {
    await context.octokit.issues.createComment({
      owner: payload.repository.owner.login,
      repo: payload.repository.name,
      issue_number: issueNumber,
      body: comment,
    });
  } catch (err: unknown) {
    context.logger.error("Adding a comment failed!", { error: err as Error });
  }
}

//// Pull Requests \\\\

export async function closePullRequest(context: Context, results: GetLinkedResults) {
  const { payload } = context;
  try {
    await context.octokit.rest.pulls.update({
      owner: payload.repository.owner.login,
      repo: payload.repository.name,
      pull_number: results.number,
      state: "closed",
    });
  } catch (err: unknown) {
    context.logger.error("Closing pull requests failed!", { error: err as Error });
  }
}

export async function closePullRequestForAnIssue(context: Context, issueNumber: number, repository: Context["payload"]["repository"], author?: string | null) {
  const logger = context.logger;
  if (!issueNumber) {
    logger.error("Issue is not defined");
    return;
  }

  const linkedPullRequests = await getLinkedPullRequests(context, {
    owner: repository.owner.login,
    repository: repository.name,
    issue: issueNumber,
  });

  if (!linkedPullRequests.length) {
    return logger.info(`No linked pull requests to close`);
  }

  logger.info(`Opened prs`, { linkedPullRequests });
  let comment = "```diff\n# These linked pull requests are closed: ";

  if (!author) {
    // Close all PRs?
    logger.error("PR author is not defined");
    return;
  }

  if (linkedPullRequests.length === 0) {
    return logger.info(`No open PRs to close`);
  }

  const currentRepo = context.payload.repository;

  for await (const pr of linkedPullRequests) {
    if (pr.author !== author || pr.organization !== currentRepo.owner.login || pr.repository !== currentRepo.name) {
      continue;
    } else {
      await closePullRequest(context, pr);
      comment += ` ${pr.href} `;
    }
  }

  if (comment === "```diff\n# These linked pull requests are closed: `") {
    return logger.info(`No PRs were closed`);
  }

  await addCommentToIssue(context, comment);
  return logger.info(comment);
}

export async function addAssignees(context: Context, issueNo: number, assignees: string[]) {
  const payload = context.payload;

  try {
    await context.octokit.rest.issues.addAssignees({
      owner: payload.repository.owner.login,
      repo: payload.repository.name,
      issue_number: issueNo,
      assignees,
    });
  } catch (e: unknown) {
    throw context.logger.error("Adding the assignee failed", { assignee: assignees, issueNo, error: e as Error });
  }
}

export async function getAllPullRequests(context: Context, state: "open" | "closed" | "all" = "open") {
  const payload = context.payload;

  try {
    return await context.octokit.paginate(context.octokit.rest.pulls.list, {
      owner: payload.repository.owner.login,
      repo: payload.repository.name,
      state,
      per_page: 100,
    });
  } catch (err: unknown) {
    context.logger.error("Fetching all pull requests failed!", { error: err as Error });
    return [];
  }
}

export async function getAllPullRequestReviews(context: Context, pullNumber: number, format: "raw" | "html" | "text" | "full" = "raw") {
  const payload = context.payload;

  const owner = payload.repository.owner.login;
  const repo = payload.repository.name;

  try {
    return await context.octokit.paginate(context.octokit.rest.pulls.listReviews, {
      owner,
      repo,
      pull_number: pullNumber,
      per_page: 100,
      mediaType: {
        format,
      },
    });
  } catch (err: unknown) {
    context.logger.error("Fetching all pull request reviews failed!", { error: err as Error });
    return [];
  }
}

export async function getAvailableOpenedPullRequests(context: Context, username: string) {
  const { reviewDelayTolerance } = context.config.timers;
  if (!reviewDelayTolerance) return [];

  const openedPullRequests = await getOpenedPullRequests(context, username);
  const result = [] as typeof openedPullRequests;

  for (let i = 0; i < openedPullRequests.length; i++) {
    const openedPullRequest = openedPullRequests[i];
    const reviews = await getAllPullRequestReviews(context, openedPullRequest.number);

    if (reviews.length > 0) {
      const approvedReviews = reviews.find((review) => review.state === "APPROVED");
      if (approvedReviews) {
        result.push(openedPullRequest);
      }
    }

    if (reviews.length === 0 && (new Date().getTime() - new Date(openedPullRequest.created_at).getTime()) / (1000 * 60 * 60) >= reviewDelayTolerance) {
      result.push(openedPullRequest);
    }
  }
  return result;
}

async function getOpenedPullRequests(context: Context, username: string): Promise<ReturnType<typeof getAllPullRequests>> {
  const prs = await getAllPullRequests(context, "open");
  return prs.filter((pr) => !pr.draft && (pr.user?.login === username || !username));
}
