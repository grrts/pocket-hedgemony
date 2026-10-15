export type Runtime = "electron" | "capacitor-ios" | "capacitor-android" | "web";

export function detectRuntime(): Runtime {
  const cap = (globalThis as { Capacitor?: { getPlatform?: () => string } }).Capacitor;
  const platform = cap?.getPlatform?.();
  if (platform === "ios") return "capacitor-ios";
  if (platform === "android") return "capacitor-android";
  if (navigator.userAgent.includes("Electron")) return "electron";
  return "web";
}

export interface Diagnostics {
  runtime: Runtime;
  origin: string;
  cores: number;
  crossOriginIsolated: boolean;
  engineMode: "worker" | "main-thread" | null;
  engineRoundTripMs: number | null;
  engineError: string | null;
}
