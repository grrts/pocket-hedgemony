import type { MapImage } from "./loadMap.ts";
import { MapRenderer, type Camera } from "./renderer.ts";

export interface OverlayContext {
  ctx: CanvasRenderingContext2D;
  /** CSS pixels per map pixel. */
  zoom: number;
  /** Converts a map position to CSS pixels on screen, picking the nearest east-west copy. */
  toScreen(x: number, y: number): [number, number];
  width: number;
  height: number;
}

/** Map pixels drawn per CSS pixel (see resize). A hard budget in docs/performance.md. */
export const MAP_PIXEL_RATIO = 1;

/** Rolling frame timings, read by the performance checks (scripts/perf.mjs). */
export interface FrameStats {
  frames: number;
  /** Milliseconds per frame spent drawing the map (GPU work included only with ?perf, which waits for it). */
  mapMs: number[];
  /** Milliseconds per frame spent drawing labels, towns and armies. */
  overlayMs: number[];
}

export interface MapViewEvents {
  onTap(screenX: number, screenY: number, province: number): void;
  /** A finger held still on the map for the long-press time (SUBJ-138); a tap is not sent after it. */
  onLongPress?(screenX: number, screenY: number, province: number): void;
  longPressMs?(): number;
  drawOverlay(o: OverlayContext): void;
  /** The player moved the camera by hand: a drag that pans, or a pinch, wheel or double tap that zooms (the tutorial's camera steps, TUT-103). */
  onCamera?(action: "pan" | "zoom"): void;
}

/**
 * Owns the canvases, the camera and touch input: drag to pan, pinch or
 * wheel to zoom, tap to select. The map wraps east-west.
 */
export class MapView {
  readonly renderer: MapRenderer;
  private overlay: HTMLCanvasElement;
  private octx: CanvasRenderingContext2D;
  /** Camera in CSS pixels per map pixel. */
  camera = { x: 0, y: 0, zoom: 1 };
  private dpr = 1;
  private dirty = true;
  private pointers = new Map<number, { x: number; y: number }>();
  private gesture: { moved: number; pinchDist: number; startZoom: number } | null = null;
  private pressTimer: ReturnType<typeof setTimeout> | null = null;
  private lastAnim = 0;
  private lastFrame = 0;
  /** Battery saver's knobs (settings): frames a second at most, ms between idle animation frames (0 = none), the overlay's pixel ratio cap. */
  private power = { maxFps: 60, animMs: 200, dprCap: 2 };
  private root: HTMLElement;
  /** The view's size in CSS pixels, kept from the last resize: reading it from the page on every call forces layout. */
  private viewW = 0;
  private viewH = 0;
  readonly map: MapImage;
  private events: MapViewEvents;
  readonly stats: FrameStats = { frames: 0, mapMs: [], overlayMs: [] };
  private readonly waitForGpu = new URLSearchParams(location.search).has("perf");

  constructor(root: HTMLElement, map: MapImage, provinceCount: number, events: MapViewEvents) {
    this.root = root;
    this.map = map;
    this.events = events;
    const gl = document.createElement("canvas");
    this.overlay = document.createElement("canvas");
    for (const c of [gl, this.overlay]) {
      c.className = "map-layer";
      root.append(c);
    }
    this.renderer = new MapRenderer(gl, map, provinceCount);
    gl.addEventListener("webglcontextlost", () => this.drawFailed("the graphics context was lost"));
    this.octx = this.overlay.getContext("2d")!;
    this.bindInput();
    new ResizeObserver(() => this.resize()).observe(root);
    this.resize();
    const frame = (t: number) => {
      // Waves and the selection blink only need a few frames a second; the frame cap holds the rest back.
      const capped = t - this.lastFrame < 1000 / this.power.maxFps - 1;
      if (!capped && (this.dirty || (this.power.animMs > 0 && t - this.lastAnim > this.power.animMs))) {
        this.lastFrame = t;
        // Cleared before drawing, so a drawOverlay that is still animating
        // (marching armies) can ask for the very next frame.
        this.dirty = false;
        this.lastAnim = t;
        this.render(t);
      }
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }

  get minZoom(): number {
    return Math.max(this.viewH / this.map.height, this.viewW / this.map.width / 1.2);
  }

  readonly maxZoom = 40;

  /** The view's size in CSS pixels, as last measured. */
  get width(): number {
    return this.viewW;
  }

  get height(): number {
    return this.viewH;
  }

  invalidate(): void {
    this.dirty = true;
  }

  /** Takes the performance settings at once (SET-003). */
  setPower(power: { maxFps: number; animMs: number; dprCap: number }): void {
    const sharper = power.dprCap !== this.power.dprCap;
    this.power = power;
    if (sharper) this.resize();
    this.invalidate();
  }

  lookAt(x: number, y: number, zoom = this.camera.zoom): void {
    this.camera = { x, y, zoom: Math.min(this.maxZoom, Math.max(this.minZoom, zoom)) };
    this.clamp();
    this.invalidate();
  }

  private resize(): void {
    this.dpr = Math.min(window.devicePixelRatio || 1, this.power.dprCap);
    const w = (this.viewW = this.root.clientWidth);
    const h = (this.viewH = this.root.clientHeight);
    // The map is pixel art, so it is drawn at one pixel per CSS pixel and
    // scaled up crisply (image-rendering: pixelated): on a phone that is 4 to
    // 7 times fewer pixels for the GPU to shade than drawing at the screen's
    // own density. Labels and sprites keep the full density so text stays sharp.
    this.renderer.canvas.width = Math.round(w * MAP_PIXEL_RATIO);
    this.renderer.canvas.height = Math.round(h * MAP_PIXEL_RATIO);
    this.overlay.width = Math.round(w * this.dpr);
    this.overlay.height = Math.round(h * this.dpr);
    this.camera.zoom = Math.max(this.camera.zoom, this.minZoom);
    this.clamp();
    this.invalidate();
  }

  private clamp(): void {
    const c = this.camera;
    const halfH = this.viewH / 2 / c.zoom;
    c.y = Math.min(this.map.height - halfH, Math.max(halfH, c.y));
    c.x = ((c.x % this.map.width) + this.map.width) % this.map.width;
  }

  private render(t: number): void {
    const cam: Camera = { x: this.camera.x, y: this.camera.y, zoom: this.camera.zoom * MAP_PIXEL_RATIO };
    const t0 = performance.now();
    this.renderer.draw(cam, t / 1000);
    if (this.waitForGpu) this.renderer.gl.finish();
    if (this.renderer.watching) {
      // A device that cannot run the map shader draws nothing and says so only here.
      const err = this.renderer.firstError ?? (this.renderer.gl.getError() || null);
      if (err !== null) this.drawFailed(`WebGL error ${err}`);
      if (err !== null || this.stats.frames >= 2) this.renderer.stopWatching();
    }
    const t1 = performance.now();
    const ctx = this.octx;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.viewW, this.viewH);
    ctx.imageSmoothingEnabled = false;
    this.events.drawOverlay({
      ctx,
      zoom: this.camera.zoom,
      width: this.viewW,
      height: this.viewH,
      toScreen: (x, y) => this.toScreen(x, y),
    });
    const st = this.stats;
    st.frames++;
    st.mapMs.push(t1 - t0);
    st.overlayMs.push(performance.now() - t1);
    if (st.mapMs.length > 240) (st.mapMs.shift(), st.overlayMs.shift());
  }

  /** Says on the map that it could not be drawn, with what the device reports, so a player's screenshot names the cause. */
  private drawFailed(why: string): void {
    if (this.root.querySelector(".map-failed")) return;
    const gl = this.renderer.gl;
    const info = gl.isContextLost() ? "" : ` · ${gl.getParameter(gl.RENDERER)} · ${gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS)} textures`;
    const p = document.createElement("p");
    p.className = "map-failed";
    p.textContent = `The map could not be drawn on this device: ${why}${info}.`;
    this.root.append(p);
  }

  toScreen(x: number, y: number): [number, number] {
    const W = this.map.width;
    let dx = x - this.camera.x;
    if (dx > W / 2) dx -= W;
    else if (dx < -W / 2) dx += W;
    return [this.viewW / 2 + dx * this.camera.zoom, this.viewH / 2 + (y - this.camera.y) * this.camera.zoom];
  }

  toMap(sx: number, sy: number): [number, number] {
    const x = this.camera.x + (sx - this.viewW / 2) / this.camera.zoom;
    const y = this.camera.y + (sy - this.viewH / 2) / this.camera.zoom;
    return [((x % this.map.width) + this.map.width) % this.map.width, y];
  }

  /** The province under the middle of the view (what the ambience hears, AUD-079). */
  provinceAtCentre(): number {
    return this.provinceAt(this.viewW / 2, this.viewH / 2);
  }

  provinceAt(sx: number, sy: number): number {
    const [x, y] = this.toMap(sx, sy);
    const px = Math.floor(x);
    const py = Math.floor(y);
    if (py < 0 || py >= this.map.height) return -1;
    return this.map.ids[py * this.map.width + px] ?? -1;
  }

  private zoomAt(sx: number, sy: number, zoom: number): void {
    const [mx, my] = this.toMap(sx, sy);
    const z = Math.min(this.maxZoom, Math.max(this.minZoom, zoom));
    this.camera.zoom = z;
    // Keep the map point under the finger fixed.
    this.camera.x = mx - (sx - this.viewW / 2) / z;
    this.camera.y = my - (sy - this.viewH / 2) / z;
    this.clamp();
    this.invalidate();
  }

  private bindInput(): void {
    const el = this.overlay;
    el.style.touchAction = "none";
    const local = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };

    el.addEventListener("pointerdown", (e) => {
      el.setPointerCapture(e.pointerId);
      this.pointers.set(e.pointerId, local(e));
      if (this.pointers.size === 1) {
        this.gesture = { moved: 0, pinchDist: 0, startZoom: this.camera.zoom };
        const at = local(e);
        if (this.events.onLongPress) {
          this.pressTimer = setTimeout(() => {
            this.pressTimer = null;
            if (!this.gesture || this.gesture.moved >= 8 || this.pointers.size !== 1) return;
            // Held still: the long-press opens the card, and the lift that follows is no tap.
            this.gesture.moved = 99;
            this.events.onLongPress!(at.x, at.y, this.provinceAt(at.x, at.y));
          }, this.events.longPressMs?.() ?? 500);
        }
      }
      if (this.pointers.size === 2) {
        const [a, b] = [...this.pointers.values()];
        this.gesture = { moved: 99, pinchDist: Math.hypot(a!.x - b!.x, a!.y - b!.y), startZoom: this.camera.zoom };
      }
    });

    el.addEventListener("pointermove", (e) => {
      const prev = this.pointers.get(e.pointerId);
      if (!prev || !this.gesture) return;
      const now = local(e);
      this.pointers.set(e.pointerId, now);
      if (this.pointers.size === 1) {
        const dx = now.x - prev.x;
        const dy = now.y - prev.y;
        this.gesture.moved += Math.abs(dx) + Math.abs(dy);
        this.camera.x -= dx / this.camera.zoom;
        this.camera.y -= dy / this.camera.zoom;
        this.clamp();
        this.invalidate();
      } else if (this.pointers.size === 2) {
        const [a, b] = [...this.pointers.values()];
        const dist = Math.hypot(a!.x - b!.x, a!.y - b!.y);
        const mid = { x: (a!.x + b!.x) / 2, y: (a!.y + b!.y) / 2 };
        this.zoomAt(mid.x, mid.y, (this.gesture.startZoom * dist) / this.gesture.pinchDist);
        this.events.onCamera?.("zoom");
      }
    });

    const end = (e: PointerEvent) => {
      if (this.pressTimer) clearTimeout(this.pressTimer);
      this.pressTimer = null;
      const p = this.pointers.get(e.pointerId);
      this.pointers.delete(e.pointerId);
      if (p && this.gesture && this.pointers.size === 0) {
        if (this.gesture.moved < 8 && e.type === "pointerup") this.events.onTap(p.x, p.y, this.provinceAt(p.x, p.y));
        // A one-finger drag of some length pans; a pinch or a long-press is marked 99 and is not one.
        else if (this.gesture.moved >= 40 && this.gesture.moved !== 99 && this.gesture.pinchDist === 0) this.events.onCamera?.("pan");
        this.gesture = null;
      }
      if (this.pointers.size === 1 && this.gesture) this.gesture.moved = 99;
    };
    el.addEventListener("pointerup", end);
    el.addEventListener("pointercancel", end);

    el.addEventListener(
      "wheel",
      (e) => {
        e.preventDefault();
        const { x, y } = local(e as unknown as PointerEvent);
        this.zoomAt(x, y, this.camera.zoom * Math.exp(-e.deltaY * 0.0015));
        this.events.onCamera?.("zoom");
      },
      { passive: false },
    );
    el.addEventListener("dblclick", (e) => {
      const { x, y } = local(e as unknown as PointerEvent);
      this.zoomAt(x, y, this.camera.zoom * 2);
      this.events.onCamera?.("zoom");
    });
  }
}
