export interface Grid {
  width: number;
  height: number;
  pxPerDeg: number;
  latTop: number;
}

type Ring = number[][];
type Geometry = { type: "Polygon"; coordinates: Ring[] } | { type: "MultiPolygon"; coordinates: Ring[][] };

/**
 * Scanline-fills a GeoJSON polygon onto an equirectangular grid, sampling at
 * pixel centres with the even-odd rule (so holes stay empty).
 */
export function rasterize(grid: Grid, geometry: Geometry, plot: (x: number, y: number) => void): void {
  const polygons = geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
  for (const rings of polygons) {
    const rows = new Map<number, number[]>();
    for (const ring of rings) {
      for (let i = 0; i < ring.length - 1; i++) {
        const [lon0, lat0] = ring[i]!;
        const [lon1, lat1] = ring[i + 1]!;
        const x0 = (lon0! + 180) * grid.pxPerDeg - 0.5;
        const y0 = (grid.latTop - lat0!) * grid.pxPerDeg - 0.5;
        const x1 = (lon1! + 180) * grid.pxPerDeg - 0.5;
        const y1 = (grid.latTop - lat1!) * grid.pxPerDeg - 0.5;
        if (y0 === y1) continue;
        const yMin = Math.max(0, Math.ceil(Math.min(y0, y1)));
        const yMax = Math.min(grid.height - 1, Math.ceil(Math.max(y0, y1)) - 1);
        for (let y = yMin; y <= yMax; y++) {
          const x = x0 + ((y - y0) * (x1 - x0)) / (y1 - y0);
          let list = rows.get(y);
          if (!list) rows.set(y, (list = []));
          list.push(x);
        }
      }
    }
    for (const [y, xs] of rows) {
      xs.sort((a, b) => a - b);
      for (let k = 0; k + 1 < xs.length; k += 2) {
        const from = Math.max(0, Math.ceil(xs[k]!));
        const to = Math.min(grid.width - 1, Math.floor(xs[k + 1]!));
        for (let x = from; x <= to; x++) plot(x, y);
      }
    }
  }
}
