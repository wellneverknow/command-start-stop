import { Context, issueType, Label } from "../../types";
import { isParentIssue, getAvailableOpenedPullRequests, getAssignedIssues, addAssignees, addCommentToIssue } from "../../utils/issue";
import { calculateDurations } from "../../utils/shared";
import { checkTaskStale } from "./check-task-stale";
import { generateAssignmentComment } from "./generate-assignment-comment";
import { getMultiplierInfoToDisplay } from "./get-multiplier-info";
import structuredMetadata from "./structured-metadata";
import { assignTableComment } from "./table";

export async function start(context: Context, issue: Context["payload"]["issue"], sender: Context["payload"]["sender"]) {
  const { logger, config } = context;
  const { maxConcurrentTasks } = config.miscellaneous;
  const { taskStaleTimeoutDuration } = config.timers;

  // is it a child issue?
  if (issue.body && isParentIssue(issue.body)) {
    await addCommentToIssue(
      context,
      "```diff\n# Please select a child issue from the specification checklist to work on. The '/start' command is disabled on parent issues.\n```"
    );
    console.error(`Skipping '/start' since the issue is a parent issue`);
    throw new Error("Issue is a parent issue");
  }

  let commitHash: string | null = null;

  try {
    const hashResponse = await context.octokit.repos.getCommit({
      owner: context.payload.repository.owner.login,
      repo: context.payload.repository.name,
      ref: context.payload.repository.default_branch,
    });
    commitHash = hashResponse.data.sha;
  } catch (e) {
    console.error("Error while getting commit hash", e);
  }

  // check max assigned issues

  const openedPullRequests = await getAvailableOpenedPullRequests(context, sender.login);
  logger.info(`Opened Pull Requests with approved reviews or with no reviews but over 24 hours have passed: ${JSON.stringify(openedPullRequests)}`);

  const assignedIssues = await getAssignedIssues(context, sender.login);
  logger.info("Max issue allowed is", maxConcurrentTasks);

  // check for max and enforce max

  if (assignedIssues.length - openedPullRequests.length >= maxConcurrentTasks) {
    await addCommentToIssue(context, "```diff\n! Too many assigned issues, you have reached your max limit.\n```");
    throw new Error(`Too many assigned issues, you have reached your max limit of ${maxConcurrentTasks} issues.`);
  }

  // is it assignable?

  if (issue.state === issueType.CLOSED) {
    await addCommentToIssue(context, "```diff\n! The issue is closed. Please choose another unassigned bounty.\n```");
    throw new Error("Issue is closed");
  }

  const assignees = (issue?.assignees ?? []).filter(Boolean);
  if (assignees.length !== 0) {
    await addCommentToIssue(context, "```diff\n! The issue is already assigned. Please choose another unassigned bounty.\n```");
    throw new Error("Issue is already assigned");
  }

  // get labels

  const labels = issue.labels;
  const priceLabel = labels.find((label: Label) => label.name.startsWith("Price: "));

  if (!priceLabel) {
    await addCommentToIssue(context, "```diff\n! No price label is set to calculate the duration.\n```");
    throw new Error("No price label is set to calculate the duration");
  }

  const duration: number | null = calculateDurations(labels).shift() || null;

  const { id, login } = sender;
  const toCreate = { duration, priceLabel, revision: commitHash?.substring(0, 7) };

  const assignmentComment = await generateAssignmentComment(context, issue.created_at, issue.number, id, duration);
  const metadata = structuredMetadata.create<typeof toCreate>("Assignment", toCreate);

  // add assignee

  if (!assignees.map((i) => i?.login).includes(login)) {
    await addAssignees(context, issue.number, [login]);
  }

  const isTaskStale = checkTaskStale(taskStaleTimeoutDuration, issue.created_at);
  const { multiplierAmount, multiplierReason, totalPriceOfTask } = await getMultiplierInfoToDisplay(context, issue.labels);

  await addCommentToIssue(
    context,
    [
      assignTableComment({
        multiplierAmount,
        multiplierReason,
        totalPriceOfTask,
        isTaskStale,
        daysElapsedSinceTaskCreation: assignmentComment.daysElapsedSinceTaskCreation,
        taskDeadline: assignmentComment.deadline,
        registeredWallet: assignmentComment.registeredWallet,
      }),
      assignmentComment.tips,
      metadata,
    ].join("\n") as string
  );

  return { output: "Task assigned successfully" };
}
