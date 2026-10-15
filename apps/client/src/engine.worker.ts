/// <reference lib="webworker" />
import { createEngineHost, type EngineRequest } from "@ph/engine";
import { loadDefaultRuleset } from "@ph/rules";

declare const self: DedicatedWorkerGlobalScope;

const handle = createEngineHost(loadDefaultRuleset);

self.onmessage = (event: MessageEvent<EngineRequest>) => {
  const { response, transfer } = handle(event.data);
  self.postMessage(response, transfer);
};
