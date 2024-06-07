import { SupportedEvents, SupportedEventsU } from "./context";
import { StaticDecode, Type as T } from "@sinclair/typebox";

export interface PluginInputs<T extends SupportedEventsU = SupportedEventsU, TU extends SupportedEvents[T] = SupportedEvents[T]> {
  stateId: string;
  eventName: T;
  eventPayload: TU["payload"];
  settings: StartStopSettings;
  authToken: string;
  ref: string;
}

const oneDay = 24 * 60 * 60 * 1000;

export const startStopSchema = T.Object({
  disabledCommands: T.Array(T.String(), { default: ["start", "stop"] }),
  timers: T.Object(
    {
      reviewDelayTolerance: T.Number(),
      taskStaleTimeoutDuration: T.Number(),
    },
    { default: { reviewDelayTolerance: oneDay * 5, taskStaleTimeoutDuration: oneDay * 30 } }
  ),
  miscellaneous: T.Object(
    {
      maxConcurrentTasks: T.Number(),
    },
    { default: { maxConcurrentTasks: 3 } }
  ),
});

export type StartStopSettings = StaticDecode<typeof startStopSchema>;
