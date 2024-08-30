
import { Assignee, Context, ISSUE_TYPE, Label } from "../../types";
import { isParentIssue, getAvailableOpenedPullRequests, getAssignedIssues, addAssignees, addCommentToIssue, getTimeValue } from "../../utils/issue";
import { calculateDurations } from "../../utils/shared";
import { checkTaskStale } from "./check-task-stale";
import { hasUserBeenUnassigned } from "./check-assignments";
import { generateAssignmentComment } from "./generate-assignment-comment";
import { getUserRoleAndTaskLimit } from "./get-user-task-limit-and-role";
import structuredMetadata from "./structured-metadata";
import { assignTableComment } from "./table";

export async function start(context: Context, issue: Context["payload"]["issue"], sender: Context["payload"]["sender"], teammates: string[]) {
  const { logger, config } = context;
  const { maxConcurrentTasks, taskStaleTimeoutDuration } = config;
  const maxTask = await getUserRoleAndTaskLimit(context, sender.login);

  // is it a child issue?
  if (issue.body && isParentIssue(issue.body)) {
    await addCommentToIssue(
      context,
      "```diff\n# Please select a child issue from the specification checklist to work on. The '/start' command is disabled on parent issues.\n```"
    );
    throw new Error(logger.error(`Skipping '/start' since the issue is a parent issue`).logMessage.raw);
  }

  let commitHash: string | null = null;

  try {
    const hashResponse = await context.octokit.rest.repos.getCommit({
      owner: context.payload.repository.owner.login,
      repo: context.payload.repository.name,
      ref: context.payload.repository.default_branch,
    });
    commitHash = hashResponse.data.sha;
  } catch (e) {
    logger.error("Error while getting commit hash", { error: e as Error });
  }

  // check max assigned issues
  const openedPullRequests = await getAvailableOpenedPullRequests(context, sender.login);
  logger.info(`Opened Pull Requests with approved reviews or with no reviews but over 24 hours have passed`, {
    openedPullRequests: openedPullRequests.map((pr) => pr.html_url),
  });

  const assignedIssues = await getAssignedIssues(context, sender.login);
  logger.info("Max issues allowed is", { limit: maxTask.limit, assigned: assignedIssues.length });

  // check for max and enforce max

  if (Math.abs(assignedIssues.length - openedPullRequests.length) >= maxTask.limit) {
    const log = logger.error("Too many assigned issues, you have reached your max limit")
    await addCommentToIssue(context, log?.logMessage.diff as string);
    throw new Error(`Too many assigned issues, you have reached your max limit of ${maxTask.limit} issues.`);
  }

  // is it assignable?

  if (issue.state === ISSUE_TYPE.CLOSED) {
    throw new Error(logger.error("This issue is closed, please choose another.", { issueNumber: issue.number }).logMessage.raw);
  }

  const assignees = issue?.assignees ?? [];

  // find out if the issue is already assigned
  if (assignees.length !== 0) {
    const isCurrentUserAssigned = !!assignees.find((assignee) => assignee?.login === sender.login);
    throw new Error(
      logger.error(
        isCurrentUserAssigned ? "You are already assigned to this task." : "This issue is already assigned. Please choose another unassigned task.",
        { issueNumber: issue.number }
      ).logMessage.raw
    );
  }

  teammates.push(sender.login);

  const toAssign = [];
  // check max assigned issues
  for (const user of teammates) {
    if (await handleTaskLimitChecks(user, context, maxConcurrentTasks, logger, sender.login)) {
      toAssign.push(user);
    }
  }

  let error: string | null = null;

  if (toAssign.length === 0 && teammates.length > 1) {
    error = "All teammates have reached their max task limit. Please close out some tasks before assigning new ones.";
  } else if (toAssign.length === 0) {
    error = "You have reached your max task limit. Please close out some tasks before assigning new ones.";
  }

  if (error) {
    throw new Error(logger.error(error, { issueNumber: issue.number }).logMessage.raw);
  }

  // get labels
  const labels = issue.labels;
  const priceLabel = labels.find((label: Label) => label.name.startsWith("Price: "));

  if (!priceLabel) {
    throw new Error(logger.error("No price label is set to calculate the duration", { issueNumber: issue.number }).logMessage.raw);
  }

  const duration: number = calculateDurations(labels).shift() ?? 0;
  const toAssignIds = await fetchUserIds(context, toAssign);

  const assignmentComment = await generateAssignmentComment(context, issue.created_at, issue.number, sender.id, duration);
  const logMessage = logger.info("Task assigned successfully", {
    taskDeadline: assignmentComment.deadline,
    taskAssignees: toAssignIds,
    priceLabel,
    revision: commitHash?.substring(0, 7),
  });
  const metadata = structuredMetadata.create("Assignment", logMessage);

  // add assignee
  await addAssignees(context, issue.number, toAssign);

  const isTaskStale = checkTaskStale(getTimeValue(taskStaleTimeoutDuration), issue.created_at);

  await addCommentToIssue(
    context,
    [
      assignTableComment({
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

async function handleTaskLimitChecks(username: string, context: Context, maxConcurrentTasks: { [role: string]: number }, logger: Context["logger"], sender: string) {
  
async function fetchUserIds(context: Context, username: string[]) {
  const ids = [];

  for (const user of username) {
    const { data } = await context.octokit.rest.users.getByUsername({
      username: user,
    });

    ids.push(data.id);
  }

  if (ids.filter((id) => !id).length > 0) {
    throw new Error("Error while fetching user ids");
  }

  return ids;
}

async function handleTaskLimitChecks(username: string, context: Context, maxConcurrentTasks: number, logger: Context["logger"], sender: string) {

  const openedPullRequests = await getAvailableOpenedPullRequests(context, username);
  const assignedIssues = await getAssignedIssues(context, username);

  // check for max and enforce max
  const maxTask = await getUserRoleAndTaskLimit(context, sender);
  const maxTasksForRole = maxConcurrentTasks[maxTask.limit] ?? 0;

  if (assignedIssues.length - openedPullRequests.length >= maxTasksForRole) {
    throw logger.error(username === sender ? "You have reached your max task limit" : `${username} has reached their max task limit`, {

  if (Math.abs(assignedIssues.length - openedPullRequests.length) >= maxConcurrentTasks) {
    const log = logger.error(username === sender ? "You have reached your max task limit" : `${username} has reached their max task limit`, {
      assignedIssues: assignedIssues.length,
      openedPullRequests: openedPullRequests.length,
      maxConcurrentTasks: maxTasksForRole,
    });
    await addCommentToIssue(context, log?.logMessage.diff as string);
    return false;
  }

  if (await hasUserBeenUnassigned(context, username)) {
    throw new Error(logger.error(`${username} you were previously unassigned from this task. You cannot be reassigned.`, { username }).logMessage.raw);
  }

  return true;
}

