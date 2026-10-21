import { renderBed } from "./ambience.ts";

/** Synthesizes ambience beds off the page's thread, so panning over a coast never stutters. */
self.onmessage = (e: MessageEvent<{ key: string; bed: string; windier: boolean }>) => {
  const { key, bed, windier } = e.data;
  const [L, R] = renderBed(bed, windier);
  (self as unknown as Worker).postMessage({ key, L, R }, [L.buffer, R.buffer]);
};
