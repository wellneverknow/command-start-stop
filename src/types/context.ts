import { EmitterWebhookEvent as WebhookEvent, EmitterWebhookEventName as WebhookEventName } from "@octokit/webhooks";
import { Octokit } from "@octokit/rest";
import { StartStopSettings } from "./plugin-input";
import { createAdapters } from "../adapters";
import { Env } from "./env";

export interface Logger {
  fatal: (message: unknown, ...optionalParams: unknown[]) => void;
  error: (message: unknown, ...optionalParams: unknown[]) => void;
  warn: (message: unknown, ...optionalParams: unknown[]) => void;
  info: (message: unknown, ...optionalParams: unknown[]) => void;
  debug: (message: unknown, ...optionalParams: unknown[]) => void;
}

export type SupportedEventsU = "issue_comment.created";

export type SupportedEvents = {
  [K in SupportedEventsU]: K extends WebhookEventName ? WebhookEvent<K> : never;
};

export interface Context<T extends SupportedEventsU = SupportedEventsU, TU extends SupportedEvents[T] = SupportedEvents[T]> {
  eventName: T;
  payload: TU["payload"];
  octokit: InstanceType<typeof Octokit>;
  adapters: ReturnType<typeof createAdapters>;
  config: StartStopSettings;
  env: Env;
  logger: Logger;
}
