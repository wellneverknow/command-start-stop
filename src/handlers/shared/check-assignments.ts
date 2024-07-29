import { Context, IssueEvent } from "../../types";

export async function checkPreviousAssignments(context: Context, sender: Context["payload"]["sender"]): Promise<boolean> {
  const events = await getAssignmentEvents(context);
  const senderLogin = sender.login.toLowerCase();
  const userAssignments = events.filter((event) => event.assignee?.toLowerCase() === senderLogin);

  if (userAssignments.length === 0) {
    return false;
  }

  const unassignedEvents = userAssignments.filter((event) => event.event === "unassigned");
  const botUnassigned = unassignedEvents.filter((event) => event.actorType === "Bot");
  const adminUnassigned = unassignedEvents.filter((event) => event.actor?.toLowerCase() !== senderLogin && event.actorType === "User");
  const userSelfUnassignViaUi = unassignedEvents.filter((event) => event.actor?.toLowerCase() === senderLogin);
  return botUnassigned.length > 0 || adminUnassigned.length > 0 || userSelfUnassignViaUi.length > 0;
}

async function getAssignmentEvents(context: Context) {
  const { repository, issue } = context.payload;
  try {
    const { data } = (await context.octokit.issues.listEventsForTimeline({
      owner: repository.owner.login,
      repo: repository.name,
      issue_number: issue.number,
    })) as IssueEvent;

    const events = data
      .filter((event) => event.event === "assigned" || event.event === "unassigned")
      .map((event) => {
        let actor, assignee, createdAt, actorType;

        switch (event.event) {
          case "unassigned":
          case "assigned":
            if ("actor" in event && event.actor && "assignee" in event && event.assignee) {
              actor = event.actor.login;
              assignee = event.assignee.login;
              createdAt = event.created_at;
              actorType = event.actor.type;
            }
            break;
          default:
            break;
        }

        return {
          event: event.event,
          actor,
          actorType,
          assignee,
          createdAt,
        };
      });

    return events
      .filter((event) => event !== undefined)
      .sort((a, b) => {
        return new Date(a.createdAt || "").getTime() - new Date(b.createdAt || "").getTime();
      });
  } catch (error) {
    context.logger.error("Error while getting assignment events", { error: error as Error });
    return [];
  }
}
