/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable sonarjs/no-duplicate-string */
import { http, HttpResponse } from "msw";
import { db } from "./db";
import issueTemplate from "./issue-template";

/**
 * Intercepts the routes and returns a custom payload
 */
export const handlers = [
  // get repo
  http.get("https://api.github.com/repos/:owner/:repo", ({ params: { owner, repo } }: { params: { owner: string; repo: string } }) => {
    const item = db.repo.findFirst({ where: { name: { equals: repo }, owner: { login: { equals: owner } } } });
    if (!item) {
      return new HttpResponse(null, { status: 404 });
    }
    return HttpResponse.json(item);
  }),
  // get issue
  http.get("https://api.github.com/repos/:owner/:repo/issues", ({ params: { owner, repo } }: { params: { owner: string; repo: string } }) => {
    return HttpResponse.json(db.issue.findMany({ where: { owner: { equals: owner }, repo: { equals: repo } } }));
  }),
  // create issue
  http.post("https://api.github.com/repos/:owner/:repo/issues", () => {
    const id = db.issue.count() + 1;
    const newItem = { ...issueTemplate, id };
    db.issue.create(newItem);
    return HttpResponse.json(newItem);
  }),
  // get repo issues
  http.get("https://api.github.com/orgs/:org/repos", ({ params: { org } }: { params: { org: string } }) => {
    return HttpResponse.json(db.repo.findMany({ where: { owner: { login: { equals: org } } } }));
  }),
  // add comment to issue
  http.post("https://api.github.com/repos/:owner/:repo/issues/:issue_number/comments", ({ params: { owner, repo, issue_number } }) => {
    return HttpResponse.json({ owner, repo, issue_number });
  }),
  // get commit
  http.get("https://api.github.com/repos/:owner/:repo/commits/:ref", () => {
    const res = {
      data: {
        sha: "commitHash",
      },
    };

    return HttpResponse.json(res);
  }),
  // list pull requests
  http.get("https://api.github.com/repos/:owner/:repo/pulls", ({ params: { owner, repo } }: { params: { owner: string; repo: string } }) => {
    return HttpResponse.json(db.pull.findMany({ where: { owner: { equals: owner }, repo: { equals: repo } } }));
  }),
  // list reviews for a pull request
  http.get("https://api.github.com/repos/:owner/:repo/pulls/:pull_number/reviews", ({ params: { owner, repo, pull_number } }) => {
    return HttpResponse.json(
      db.review.findMany({
        where: { owner: { equals: owner as string }, repo: { equals: repo as string }, pull_number: { equals: pull_number as unknown as number } },
      })
    );
  }),
  // list events for an issue timeline
  http.get("https://api.github.com/repos/:owner/:repo/issues/:issue_number/timeline", () => {
    return HttpResponse.json(db.event.getAll());
  }),
  // update a pull request
  http.patch("https://api.github.com/repos/:owner/:repo/pulls/:pull_number", ({ params: { owner, repo, pull_number } }) => {
    return HttpResponse.json({ owner, repo, pull_number });
  }),
  // add assignee to an issue
  http.post("https://api.github.com/repos/:owner/:repo/issues/:issue_number/assignees", ({ params: { owner, repo, issue_number } }) => {
    return HttpResponse.json({ owner, repo, issue_number });
  }),
  // list all pull requests
  http.get("https://api.github.com/repos/:owner/:repo/pulls", ({ params: { owner, repo } }) => {
    return HttpResponse.json(db.pull.findMany({ where: { owner: { equals: owner as string }, repo: { equals: repo as string } } }));
  }),
  // get commit hash
  http.get("https://api.github.com/repos/:owner/:repo/commits", () => {
    return HttpResponse.json({ sha: "commitHash" });
  }),
  // list all pull request reviews
  http.get("https://api.github.com/repos/:owner/:repo/pulls/:pull_number/reviews", ({ params: { owner, repo, pull_number } }) => {
    return HttpResponse.json(
      db.review.findMany({
        where: { owner: { equals: owner as string }, repo: { equals: repo as string }, pull_number: { equals: pull_number as unknown as number } },
      })
    );
  }),
  // issues list for repo
  http.get("https://api.github.com/repos/:owner/:repo/issues", ({ params: { owner, repo } }) => {
    return HttpResponse.json(db.issue.findMany({ where: { owner: { equals: owner as string }, repo: { equals: repo as string } } }));
  }),
  // remove assignee from an issue
  http.delete("https://api.github.com/repos/:owner/:repo/issues/:issue_number/assignees", ({ params: { owner, repo, issue_number } }) => {
    return HttpResponse.json({ owner, repo, issue_number });
  }),
];
