import { Context } from "../types/context";
import { Issue } from "../types";

interface GetLinkedParams {
  owner: string;
  repository: string;
  issue: number;
}

interface GetLinkedResults {
  organization: string;
  repository: string;
  number: number;
  href: string;
}

export async function getLinkedPullRequests(context: Context, { owner, repository, issue }: GetLinkedParams): Promise<GetLinkedResults[]> {
  const { data: timeline } = await context.octokit.issues.listEventsForTimeline({
    owner,
    repo: repository,
    issue_number: issue,
  });

  const LINKED_PRS = timeline.filter(
    (event) =>
      event.event === "cross-referenced"
      && "source" in event
      && !!event.source.issue
      && "repository" in event.source.issue
      && "pull_request" in event.source.issue
  ).map((event) => (event as { source: { issue: Issue } }).source.issue);

  return LINKED_PRS.map((pr) => {
    return {
      organization: pr.repository?.full_name.split("/")[0],
      repository: pr.repository?.full_name.split("/")[1],
      number: pr.number,
      href: pr.html_url,
    };
  }).filter((pr) => pr !== null) as GetLinkedResults[];
}
