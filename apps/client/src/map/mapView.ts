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

export interface MapViewEvents {
  onTap(screenX: number, screenY: number, province: number): void;
  drawOverlay(o: OverlayContext): void;
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
  private lastAnim = 0;
  private root: HTMLElement;
  readonly map: MapImage;
  private events: MapViewEvents;

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
    this.octx = this.overlay.getContext("2d")!;
    this.bindInput();
    new ResizeObserver(() => this.resize()).observe(root);
    this.resize();
    const frame = (t: number) => {
      // Waves and the selection blink only need a few frames a second.
      if (this.dirty || t - this.lastAnim > 200) {
        this.render(t);
        this.lastAnim = t;
        this.dirty = false;
      }
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }

  get minZoom(): number {
    return Math.max(this.root.clientHeight / this.map.height, this.root.clientWidth / this.map.width / 1.2);
  }

  readonly maxZoom = 24;

  invalidate(): void {
    this.dirty = true;
  }

  lookAt(x: number, y: number, zoom = this.camera.zoom): void {
    this.camera = { x, y, zoom: Math.min(this.maxZoom, Math.max(this.minZoom, zoom)) };
    this.clamp();
    this.invalidate();
  }

  private resize(): void {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = this.root.clientWidth;
    const h = this.root.clientHeight;
    for (const c of [this.renderer.canvas, this.overlay]) {
      c.width = Math.round(w * this.dpr);
      c.height = Math.round(h * this.dpr);
    }
    this.camera.zoom = Math.max(this.camera.zoom, this.minZoom);
    this.clamp();
    this.invalidate();
  }

  private clamp(): void {
    const c = this.camera;
    const halfH = this.root.clientHeight / 2 / c.zoom;
    c.y = Math.min(this.map.height - halfH, Math.max(halfH, c.y));
    c.x = ((c.x % this.map.width) + this.map.width) % this.map.width;
  }

  private render(t: number): void {
    const cam: Camera = { x: this.camera.x, y: this.camera.y, zoom: this.camera.zoom * this.dpr };
    this.renderer.draw(cam, t / 1000);
    const ctx = this.octx;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.root.clientWidth, this.root.clientHeight);
    ctx.imageSmoothingEnabled = false;
    this.events.drawOverlay({
      ctx,
      zoom: this.camera.zoom,
      width: this.root.clientWidth,
      height: this.root.clientHeight,
      toScreen: (x, y) => this.toScreen(x, y),
    });
  }

  toScreen(x: number, y: number): [number, number] {
    const W = this.map.width;
    let dx = x - this.camera.x;
    if (dx > W / 2) dx -= W;
    else if (dx < -W / 2) dx += W;
    return [this.root.clientWidth / 2 + dx * this.camera.zoom, this.root.clientHeight / 2 + (y - this.camera.y) * this.camera.zoom];
  }

  toMap(sx: number, sy: number): [number, number] {
    const x = this.camera.x + (sx - this.root.clientWidth / 2) / this.camera.zoom;
    const y = this.camera.y + (sy - this.root.clientHeight / 2) / this.camera.zoom;
    return [((x % this.map.width) + this.map.width) % this.map.width, y];
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
    this.camera.x = mx - (sx - this.root.clientWidth / 2) / z;
    this.camera.y = my - (sy - this.root.clientHeight / 2) / z;
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
      if (this.pointers.size === 1) this.gesture = { moved: 0, pinchDist: 0, startZoom: this.camera.zoom };
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
      }
    });

    const end = (e: PointerEvent) => {
      const p = this.pointers.get(e.pointerId);
      this.pointers.delete(e.pointerId);
      if (p && this.gesture && this.pointers.size === 0) {
        if (this.gesture.moved < 8 && e.type === "pointerup") this.events.onTap(p.x, p.y, this.provinceAt(p.x, p.y));
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
      },
      { passive: false },
    );
    el.addEventListener("dblclick", (e) => {
      const { x, y } = local(e as unknown as PointerEvent);
      this.zoomAt(x, y, this.camera.zoom * 2);
    });
  }
}
