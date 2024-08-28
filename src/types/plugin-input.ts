import { SupportedEvents, SupportedEventsU } from "./context";
import { Static, StaticDecode, Type as T } from "@sinclair/typebox";
import { StandardValidator } from "typebox-validators";

export interface PluginInputs<T extends SupportedEventsU = SupportedEventsU, TU extends SupportedEvents[T] = SupportedEvents[T]> {
  stateId: string;
  eventName: T;
  eventPayload: TU["payload"];
  settings: StartStopSettings;
  authToken: string;
  ref: string;
}

const ONE_DAY = 24 * 60 * 60 * 1000;

const userRoleSchema = T.Union([T.Literal("Admin"), T.Literal("Member"), T.Literal("Contributor"), T.String()]);

export const startStopSchema = T.Object({
  timers: T.Object(
    {
      reviewDelayTolerance: T.Number(),
      taskStaleTimeoutDuration: T.Number(),
    },
    { default: { reviewDelayTolerance: ONE_DAY * 5, taskStaleTimeoutDuration: ONE_DAY * 30 } }
  ),
  miscellaneous: T.Object(
    {
      startRequiresWallet: T.Boolean({ default: true }}),
      maxConcurrentTasks: T.Record(T.String(), T.Integer(), { default: { admin: 20, member: 10, contributor: 2 } }),
    },
    {
      default: {}
        maxConcurrentTasks: {
          admin: 20,
          member: 10,
          contributor: 2,
        },
        startRequiresWallet: true,
      },
    }
  ),
});

export type StartStopSettings = StaticDecode<typeof startStopSchema>;
export const startStopSettingsValidator = new StandardValidator(startStopSchema);