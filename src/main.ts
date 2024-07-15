import * as core from "@actions/core";
import * as github from "@actions/github";
import { Octokit } from "@octokit/rest";
import { Value } from "@sinclair/typebox/build/cjs/value";
import { envSchema, startStopSchema, PluginInputs } from "./types";
import { startStopTask } from "./plugin";

export async function run() {
  const payload = github.context.payload.inputs;

  const env = Value.Decode(envSchema, process.env);
  const settings = Value.Decode(startStopSchema, JSON.parse(payload.settings));

  const inputs: PluginInputs = {
    stateId: payload.stateId,
    eventName: payload.eventName,
    eventPayload: JSON.parse(payload.eventPayload),
    settings,
    authToken: payload.authToken,
    ref: payload.ref,
  };

  await startStopTask(inputs, env);

  return toKernel(inputs.authToken, inputs.stateId, {});
}

async function toKernel(repoToken: string, stateId: string, output: object) {
  const octokit = new Octokit({ auth: repoToken });
  await octokit.repos.createDispatchEvent({
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
    event_type: "return_data_to_ubiquibot_kernel",
    client_payload: {
      state_id: stateId,
      output: JSON.stringify(output),
    },
  });
}

run()
  .then((result) => {
    core.setOutput("result", result);
  })
  .catch((error) => {
    console.error(error);
    core.setFailed(error);
  });
