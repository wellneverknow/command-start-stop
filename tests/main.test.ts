import { drop } from "@mswjs/data";
import { Context, SupportedEventsU } from "../src/types";
import { db } from "./__mocks__/db";
import { server } from "./__mocks__/node";
import usersGet from "./__mocks__/users-get.json";
import { expect, describe, beforeAll, beforeEach, afterAll, afterEach } from "@jest/globals";
import { userStartStop } from "../src/handlers/user-start-stop";
import issueTemplate from "./__mocks__/issue-template";
import { createAdapters } from "../src/adapters";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import { Logs } from "@ubiquity-dao/ubiquibot-logger/.";
dotenv.config();

type Issue = Context["payload"]["issue"];
type Sender = Context["payload"]["sender"];

const octokit = jest.requireActual("@octokit/rest");

const url = "https://sbxscxthunnhozvgtshx.supabase.co";
const key =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNieHNjeHRodW5uaG96dmd0c2h4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTE0Nzg2MDcsImV4cCI6MjAyNzA1NDYwN30.-DstUzIspsRlLQPHR1da6nY5GBBs5I4Wd0jlK5zFzyU";

if (!url || !key) {
  throw new Error("Supabase URL and Key are required");
}

beforeAll(() => {
  server.listen();
});
afterEach(() => {
  drop(db);
  server.resetHandlers();
});
afterAll(() => server.close());

describe("User start/stop", () => {
  beforeEach(async () => {
    await setupTests();
  });

  test("User can start an issue", async () => {
    const issue = db.issue.findFirst({ where: { id: { equals: 1 } } }) as unknown as Issue;
    const sender = db.users.findFirst({ where: { id: { equals: 1 } } }) as unknown as Sender;

    const context = createContext(issue, sender);

    const { output } = await userStartStop(context as unknown as Context);

    expect(output).toEqual("Task assigned successfully");
  });

  test("User can stop an issue", async () => {
    // using the second issue
    const issue = db.issue.findFirst({ where: { id: { equals: 2 } } }) as unknown as Issue;
    const sender = db.users.findFirst({ where: { id: { equals: 2 } } }) as unknown as Sender;

    const context = createContext(issue, sender, "/stop");

    const { output } = await userStartStop(context as unknown as Context);

    expect(output).toEqual("Task unassigned successfully");
  });

  test("User can't stop an issue they're not assigned to", async () => {
    // using the second issue
    const issue = db.issue.findFirst({ where: { id: { equals: 2 } } }) as unknown as Issue;
    const sender = db.users.findFirst({ where: { id: { equals: 1 } } }) as unknown as Sender;

    const context = createContext(issue, sender, "/stop");

    const output = await userStartStop(context as unknown as Context);

    expect(output).toEqual({ output: "You are not assigned to this task" });
  });

  test("User can't stop an issue without assignees", async () => {
    // using the second issue
    const issue = db.issue.findFirst({ where: { id: { equals: 6 } } }) as unknown as Issue;
    const sender = db.users.findFirst({ where: { id: { equals: 1 } } }) as unknown as Sender;

    const context = createContext(issue, sender, "/stop");

    const output = await userStartStop(context as unknown as Context);

    expect(output).toEqual({ output: "No assignees found for this task" });
  });

  test("User can't start an issue that's already assigned", async () => {
    const issue = db.issue.findFirst({ where: { id: { equals: 2 } } }) as unknown as Issue;
    const sender = db.users.findFirst({ where: { id: { equals: 1 } } }) as unknown as Sender;

    const context = createContext(issue, sender, "/start");

    const err = "Issue is already assigned";

    try {
      await userStartStop(context as unknown as Context);
    } catch (error) {
      if (error instanceof Error) {
        expect(error.message).toEqual(err);
      }
    }
  });

  test("User can't start an issue without a price label", async () => {
    const issue = db.issue.findFirst({ where: { id: { equals: 3 } } }) as unknown as Issue;
    const sender = db.users.findFirst({ where: { id: { equals: 1 } } }) as unknown as Sender;

    const context = createContext(issue, sender);

    const err = "No price label is set to calculate the duration";

    try {
      await userStartStop(context as unknown as Context);
    } catch (error) {
      if (error instanceof Error) {
        expect(error.message).toEqual(err);
      }
    }
  });

  test("User can't start an issue without a wallet address", async () => {
    const issue = db.issue.findFirst({ where: { id: { equals: 1 } } }) as unknown as Issue;
    const sender = db.users.findFirst({ where: { id: { equals: 1 } } }) as unknown as Sender;
    const context = createContext(issue, sender, "/start", true, false);

    try {
      await userStartStop(context as unknown as Context);
    } catch (error) {
      if (error instanceof Error) {
        expect(error.message).toEqual("No wallet address found");
      }
    }
  });

  test("User can't start an issue that's closed", async () => {
    const issue = db.issue.findFirst({ where: { id: { equals: 4 } } }) as unknown as Issue;
    const sender = db.users.findFirst({ where: { id: { equals: 1 } } }) as unknown as Sender;

    const context = createContext(issue, sender);

    try {
      await userStartStop(context as unknown as Context);
    } catch (error) {
      if (error instanceof Error) {
        expect(error.message).toEqual("Issue is closed");
      }
    }
  });

  test("User can't start if command is disabled", async () => {
    const issue = db.issue.findFirst({ where: { id: { equals: 1 } } }) as unknown as Issue;
    const sender = db.users.findFirst({ where: { id: { equals: 1 } } }) as unknown as Sender;

    const context = createContext(issue, sender, "/start", false);

    context.adapters = createAdapters(getSupabase(), context as unknown as Context);

    try {
      await userStartStop(context as unknown as Context);
    } catch (error) {
      if (error instanceof Error) {
        expect(error.message).toEqual("The '/start' command is disabled for this repository.");
      }
    }
  });

  test("User can't stop if command is disabled", async () => {
    const issue = db.issue.findFirst({ where: { id: { equals: 1 } } }) as unknown as Issue;
    const sender = db.users.findFirst({ where: { id: { equals: 1 } } }) as unknown as Sender;

    const context = createContext(issue, sender, "/stop", false);

    try {
      await userStartStop(context as unknown as Context);
    } catch (error) {
      if (error instanceof Error) {
        expect(error.message).toEqual("The '/stop' command is disabled for this repository.");
      }
    }
  });

  test("User can't start an issue that's a parent issue", async () => {
    const issue = db.issue.findFirst({ where: { id: { equals: 1 } } }) as unknown as Issue;
    const sender = db.users.findFirst({ where: { id: { equals: 1 } } }) as unknown as Sender;

    const context = createContext(issue, sender, "/start");

    try {
      await userStartStop(context as unknown as Context);
    } catch (error) {
      if (error instanceof Error) {
        expect(error.message).toEqual("Issue is a parent issue");
      }
    }
  });

  test("should return the role with the smallest task limit if user role is not defined in config", async () => {
    jest.mock("../src/utils/issue", () => ({
      getAvailableOpenedPullRequests: jest.fn().mockResolvedValue([
        {
          number: 1,
          reviews: [
            {
              state: "APPROVED",
            },
          ],
        },
        {
          number: 2,
          reviews: [
            {
              state: "APPROVED",
            },
          ],
        },
        {
          number: 3,
          reviews: [
            {
              state: "APPROVED",
            },
          ],
        },
      ]),
    }));

    const issue = db.issue.findFirst({ where: { id: { equals: 1 } } }) as unknown as Issue;
    const sender = db.users.findFirst({ where: { id: { equals: 1 } } }) as unknown as Sender;

    const context = createContext(issue, sender);

    context.adapters = createAdapters(getSupabase(), context as unknown as Context);

    try {
      await userStartStop(context as unknown as Context);
    } catch (error) {
      if (error instanceof Error) {
        expect(error.message).toEqual("Too many assigned issues, you have reached your max limit of 3 issues.");
      }
    }
  });

  test("should set maxLimits to 5 if the user is a member", async () => {
    jest.mock("../src/utils/issue", () => ({
      getAvailableOpenedPullRequests: jest.fn().mockResolvedValue([
        {
          number: 1,
          reviews: [
            {
              state: "APPROVED",
            },
          ],
        },
        {
          number: 2,
          reviews: [
            {
              state: "APPROVED",
            },
          ],
        },
        {
          number: 3,
          reviews: [
            {
              state: "APPROVED",
            },
          ],
        },
      ]),
    }));

    const issue = db.issue.findFirst({ where: { id: { equals: 1 } } }) as unknown as Issue;
    const sender = db.users.findFirst({ where: { id: { equals: 1 } } }) as unknown as Sender;

    const context = createContext(issue, sender);

    context.adapters = createAdapters(getSupabase(), context as unknown as Context);

    try {
      await userStartStop(context as unknown as Context);
    } catch (error) {
      if (error instanceof Error) {
        expect(error.message).toEqual("Too many assigned issues, you have reached your max limit of 5 issues.");
      }
    }
  });
});

async function setupTests() {
  for (const item of usersGet) {
    db.users.create(item);
  }

  db.repo.create({
    id: 1,
    html_url: "",
    name: "test-repo",
    owner: {
      login: "ubiquity",
      id: 1,
    },
    issues: [],
  });

  db.issue.create({
    ...issueTemplate,
  });

  db.issue.create({
    ...issueTemplate,
    id: 2,
    node_id: "MDU6SXNzdWUy",
    title: "Second issue",
    number: 2,
    body: "Second issue body",
    assignee: {
      id: 2,
      login: "user2",
    },
    assignees: [
      {
        id: 2,
        login: "user2",
      },
    ],
    owner: "ubiquity",
  });

  db.issue.create({
    ...issueTemplate,
    id: 3,
    node_id: "MDU6SXNzdWUy",
    title: "Third issue",
    number: 3,
    labels: [],
    body: "Third issue body",
    owner: "ubiquity",
  });

  db.issue.create({
    ...issueTemplate,
    id: 4,
    node_id: "MDU6SXNzdWUy",
    title: "Fourth issue",
    number: 4,
    body: "Fourth issue body",
    owner: "ubiquity",
    state: "CLOSED",
  });

  db.issue.create({
    ...issueTemplate,
    id: 5,
    node_id: "MDU6SXNzdWUy",
    title: "Fifth issue",
    number: 5,
    body: "- [x] #1\n- [ ] #2",
    owner: "ubiquity",
  });

  db.issue.create({
    ...issueTemplate,
    id: 6,
    node_id: "MDU6SXNzdWUg",
    title: "Sixth issue",
    number: 5,
    body: "Sixth issue body",
    owner: "ubiquity",
    assignees: [],
  });

  db.pull.create({
    id: 1,
    html_url: "",
    number: 1,
    author: {
      id: 2,
      name: "user2",
    },
    body: "Pull request body",
    owner: "user2",
    repo: "test-repo",
  });

  db.review.create({
    id: 1,
    body: "Review body",
    commit_id: "123",
    html_url: "",
    pull_request_url: "",
    state: "APPROVED",
    submitted_at: new Date().toISOString(),
    user: {
      id: 1,
      name: "ubiquity",
    },
    pull_number: 1,
  });

  db.event.create({
    id: 1,
    actor: {
      id: 2,
      name: "user2",
    },
    commit_id: "123",
    commit_url: "",
    created_at: new Date().toISOString(),
    event: "cross-referenced",
    issue_number: 1,
    owner: "ubiquity",
    repo: "test-repo",
  });

  db.event.create({
    id: 2,
    actor: {
      id: 1,
      name: "ubiquity",
    },
    commit_id: "123",
    commit_url: "",
    created_at: new Date().toISOString(),
    event: "cross-referenced",
    issue_number: 2,
    owner: "ubiquity",
    repo: "test-repo",
  });
}

function createContext(issue: Record<string, unknown>, sender: Record<string, unknown>, body = "/start", isEnabled = true, withData = true) {
  const ctx = {
    adapters: {} as ReturnType<typeof createAdapters>,
    payload: {
      issue: issue as unknown as Context["payload"]["issue"],
      sender: sender as unknown as Context["payload"]["sender"],
      repository: db.repo.findFirst({ where: { id: { equals: 1 } } }) as unknown as Context["payload"]["repository"],
      comment: { body } as unknown as Context["payload"]["comment"],
      action: "created" as string,
      installation: { id: 1 } as unknown as Context["payload"]["installation"],
      organization: { login: "ubiquity" } as unknown as Context["payload"]["organization"],
    },
    logger: new Logs("debug"),
    config: {
      isEnabled,
      timers: {
        reviewDelayTolerance: 86000,
        taskStaleTimeoutDuration: 2580000,
      },
      miscellaneous: {
        maxConcurrentTasks: [
          {
            role: "Admin",
            limit: 10,
          },
          {
            role: "Member",
            limit: 5,
          },
          {
            role: "Collaborator",
            limit: 3,
          },
        ],
        startRequiresWallet: true,
      },
    },
    octokit: new octokit.Octokit(),
    eventName: "issue_comment.created" as SupportedEventsU,
    env: {
      SUPABASE_KEY: key,
      SUPABASE_URL: url,
    },
  } as unknown as Context;

  if (withData) {
    ctx.adapters = createAdapters(getSupabase(), ctx);
  } else {
    ctx.adapters = createAdapters(getSupabase(false), ctx);
  }

  return ctx;
}

function getSupabase(withData = true) {
  const mockedTable = {
    select: jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: withData
            ? {
                id: 1,
                wallets: {
                  address: "0x123",
                },
              }
            : {
                id: 1,
                wallets: {
                  address: undefined,
                },
              },
        }),
      }),
    }),
  };

  const mockedSupabase = {
    from: jest.fn().mockReturnValue(mockedTable),
  };

  return mockedSupabase as unknown as ReturnType<typeof createClient>;
}
