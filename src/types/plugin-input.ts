import { StaticDecode, Type as T } from "@sinclair/typebox";
import { StandardValidator } from "typebox-validators";
import { SupportedEvents, SupportedEventsU } from "./context";

export interface PluginInputs<T extends SupportedEventsU = SupportedEventsU, TU extends SupportedEvents[T] = SupportedEvents[T]> {
  stateId: string;
  eventName: T;
  eventPayload: TU["payload"];
  settings: StartStopSettings;
  authToken: string;
  ref: string;
}

function maxConcurrentTasks() {
  return T.Transform(T.Record(T.String(), T.Integer(), { default: { member: 10, contributor: 2 } }))
    .Decode((value) => {
      // If admin is omitted, defaults to infinity
      if (!Object.keys(value).includes("admin")) {
        value["admin"] = Infinity;
      }
      return value;
    })
    .Encode((value) => value);
}

export const startStopSchema = T.Object(
  {
    reviewDelayTolerance: T.String({ default: "1 Day" }),
    taskStaleTimeoutDuration: T.String({ default: "30 Days" }),
    startRequiresWallet: T.Boolean({ default: true }),
    maxConcurrentTasks: maxConcurrentTasks(),
    emptyWalletText: T.String({ default: "Please set your wallet address with the /wallet command first and try again." }),
  },
  {
    default: {},
  }
);

export type StartStopSettings = StaticDecode<typeof startStopSchema>;
export const startStopSettingsValidator = new StandardValidator(startStopSchema);
