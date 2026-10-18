import { Worker, isMainThread, parentPort, workerData } from "node:worker_threads";
import { runBreaker, type BreakerOptions, type BreakerResult } from "./breaker.ts";
import { runAiCampaign, type CampaignOptions, type CampaignResult } from "./campaign.ts";

/** One run, as data a worker thread can be handed. */
export type Job = { kind: "campaign"; options: CampaignOptions } | { kind: "breaker"; options: BreakerOptions };
export type JobResult = CampaignResult | BreakerResult;

export function runJob(job: Job): JobResult {
  return job.kind === "campaign" ? runAiCampaign(job.options) : runBreaker(job.options);
}

/**
 * Runs jobs on up to `threads` worker threads, each its own engine, and hands
 * each result to `done` as it finishes. One thread runs them in this thread.
 */
export async function runJobs(jobs: readonly Job[], threads: number, done: (r: JobResult, left: number) => void): Promise<JobResult[]> {
  const results: JobResult[] = [];
  if (threads <= 1) {
    for (const job of jobs) {
      const r = runJob(job);
      results.push(r);
      done(r, jobs.length - results.length);
    }
    return results;
  }
  let next = 0;
  const one = async (): Promise<void> => {
    while (next < jobs.length) {
      const job = jobs[next++]!;
      const r = await new Promise<JobResult>((resolve, reject) => {
        const w = new Worker(new URL(import.meta.url), { workerData: job, execArgv: process.execArgv });
        w.once("message", resolve);
        w.once("error", reject);
        w.once("exit", (code) => code !== 0 && reject(new Error(`worker stopped with code ${code}`)));
      });
      results.push(r);
      done(r, jobs.length - results.length);
    }
  };
  await Promise.all(Array.from({ length: Math.min(threads, jobs.length) }, one));
  return results;
}

if (!isMainThread && parentPort) parentPort.postMessage(runJob(workerData as Job));
