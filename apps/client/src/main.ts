import type { Order, Snapshot } from "@ph/engine";
import { loadDefaultRuleset } from "@ph/rules";
import { EngineClient } from "./engineClient.ts";
import { detectRuntime, type Diagnostics } from "./platform.ts";

// Placeholder screens for step 1: pick a nation, end turns, move armies.
// The pixel world map replaces the province list in step 2.

const rules = loadDefaultRuleset();
// ?engine=main-thread forces the fallback path, for testing it.
const forceMainThread = new URLSearchParams(location.search).get("engine") === "main-thread";
const engine = new EngineClient({ forceMainThread });
const app = document.querySelector<HTMLElement>("#app")!;

const diagnostics: Diagnostics = {
  runtime: detectRuntime(),
  origin: location.origin,
  cores: navigator.hardwareConcurrency ?? 1,
  crossOriginIsolated: globalThis.crossOriginIsolated ?? false,
  engineMode: null,
  engineRoundTripMs: null,
  engineError: null,
};
// Read by the wrapper smoke tests.
(globalThis as { __phDiagnostics?: Diagnostics }).__phDiagnostics = diagnostics;

let snapshot: Snapshot | null = null;
let pendingOrders: Order[] = [];
let busy = false;

function esc(s: string): string {
  return s.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
}

const fmt = (n: number) => Math.round(n).toLocaleString("en-US");
const monthName = (m: number) =>
  ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][m - 1];

function renderPicker(): void {
  app.innerHTML = `
    <h1>Pocket Hegemony</h1>
    <p class="sub">11 November 1444. Choose your nation.</p>
    <div class="nations">
      ${rules.nations
        .map(
          (n) => `<button class="nation" data-nation="${n.id}">
            <span class="swatch" style="background:${n.color}"></span>${esc(n.name)}</button>`,
        )
        .join("")}
    </div>
    ${renderDiagnostics()}`;
  app.querySelectorAll<HTMLButtonElement>("[data-nation]").forEach((btn) =>
    btn.addEventListener("click", () => void startGame(btn.dataset.nation!)),
  );
}

async function startGame(nation: string): Promise<void> {
  snapshot = await engine.send({ type: "newGame", seed: Date.now() >>> 0, playerNation: nation });
  renderGame();
}

async function endTurn(): Promise<void> {
  if (busy) return;
  busy = true;
  renderGame();
  snapshot = await engine.send({ type: "endTurn", orders: pendingOrders });
  pendingOrders = [];
  busy = false;
  renderGame();
}

function renderGame(): void {
  const s = snapshot!;
  const me = s.playerNation;
  const nation = rules.nations[me]!;
  const provinces = rules.provinces;
  const myArmies = [...s.armies.id.keys()].filter((k) => s.armies.owner[k] === me);
  const owned = provinces.filter((_, i) => s.provinceOwner[i] === me);

  app.innerHTML = `
    <header class="hud">
      <span class="swatch" style="background:${nation.color}"></span>
      <strong>${esc(nation.name)}</strong>
      <span>${monthName(s.date.month)} ${s.date.year}</span>
      <span title="Treasury">💰 ${s.nationTreasury[me]!.toFixed(1)} (${s.nationMonthlyIncome[me]! >= 0 ? "+" : ""}${s.nationMonthlyIncome[me]!.toFixed(2)})</span>
      <span title="Manpower">⚔ ${fmt(s.nationManpower[me]!)}</span>
    </header>
    <section>
      <h2>Armies</h2>
      ${myArmies
        .map((k) => {
          const id = s.armies.id[k]!;
          const loc = s.armies.location[k]!;
          const order = pendingOrders.find((o) => o.army === id);
          const neighbors = provinces[loc]!.neighbors;
          const cmd = s.armies.commander[k]!;
          return `<div class="row">
            <span>${fmt(s.armies.men[k]!)} men in <b>${esc(provinces[loc]!.name)}</b>${cmd >= 0 ? ` under ${esc(commanderName(cmd))}` : ""}</span>
            <select data-army="${id}">
              <option value="">Hold</option>
              ${neighbors
                .map((nb) => {
                  const idx = provinces.findIndex((p) => p.id === nb);
                  return `<option value="${idx}" ${order?.to === idx ? "selected" : ""}>Move to ${esc(provinces[idx]!.name)}</option>`;
                })
                .join("")}
            </select>
          </div>`;
        })
        .join("")}
    </section>
    <section>
      <h2>Provinces (${owned.length})</h2>
      <ul>${owned.map((p) => `<li>${esc(p.name)} <small>${p.tax}/${p.production}/${p.manpower}</small></li>`).join("")}</ul>
    </section>
    ${s.rejectedOrders.length ? `<p class="warn">${s.rejectedOrders.map((r) => esc(r.reason)).join(", ")}</p>` : ""}
    <button class="end-turn" ${busy ? "disabled" : ""}>${busy ? "Calculating…" : "End turn"}</button>
    <p class="meta">Turn ${s.turn} · engine ${s.computeMs.toFixed(2)} ms · state ${s.hash}</p>
    ${renderDiagnostics()}`;

  app.querySelector(".end-turn")!.addEventListener("click", () => void endTurn());
  app.querySelectorAll<HTMLSelectElement>("[data-army]").forEach((sel) =>
    sel.addEventListener("change", () => {
      const army = Number(sel.dataset.army);
      pendingOrders = pendingOrders.filter((o) => o.army !== army);
      if (sel.value !== "") pendingOrders.push({ type: "move", army, to: Number(sel.value) });
    }),
  );
}

function commanderName(index: number): string {
  return rules.nations.flatMap((n) => n.commanders)[index]?.name ?? "unknown";
}

function renderDiagnostics(): string {
  const d = diagnostics;
  const engineLine = d.engineError
    ? `<span class="warn">engine failed: ${esc(d.engineError)}</span>`
    : d.engineRoundTripMs === null
      ? "engine starting…"
      : d.engineMode === "worker"
        ? `engine in background worker (${d.engineRoundTripMs.toFixed(1)} ms round trip)`
        : `<span class="warn">engine on main thread (worker unavailable)</span>`;
  return `<footer class="diag">${d.runtime} · ${d.cores} cores · ${engineLine}</footer>`;
}

// Prove a worker loads and runs a turn in this runtime, using a throwaway
// worker so it can't touch the player's game.
async function selfTest(): Promise<void> {
  const probe = new EngineClient({ forceMainThread });
  const t0 = performance.now();
  try {
    await probe.send({ type: "newGame", seed: 1, playerNation: rules.nations[0]!.id });
    await probe.send({ type: "endTurn", orders: [] });
    diagnostics.engineRoundTripMs = performance.now() - t0;
  } catch (e) {
    diagnostics.engineError = e instanceof Error ? e.message : String(e);
  }
  diagnostics.engineMode = probe.mode;
  probe.terminate();
  if (!snapshot) renderPicker();
}

renderPicker();
void selfTest();
