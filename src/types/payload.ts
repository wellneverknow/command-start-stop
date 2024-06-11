import { LogReturn } from "../adapters/supabase/helpers/logs";
import { RestEndpointMethodTypes } from "@octokit/rest";

export type Issue = RestEndpointMethodTypes["issues"]["get"]["response"]["data"];
export type Label = RestEndpointMethodTypes["issues"]["listLabelsOnIssue"]["response"]["data"][0];
export type HandlerReturnValuesNoVoid = null | string | LogReturn;

export const IssueType = {
  OPEN: "open",
  CLOSED: "closed",
} as const;
