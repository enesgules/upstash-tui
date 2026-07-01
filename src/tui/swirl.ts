// Parametric Upstash swirl — a two-arm logarithmic spiral rasterized into a
// pixel grid. Pure geometry (no React), so it can be unit-tested in isolation.
//
// The grid stores, per pixel, the path parameter `t ∈ [0, 1]` at which the
// stroke first covers that pixel (or -1 for empty). Revealing every pixel with
// `t <= progress` makes the stroke draw itself along its path — the trace-in.
// Two arms 180° apart share the same `t` progression, so they trace together.

export interface SwirlOptions {
  /** Pixel grid width. */
  width: number
  /** Pixel grid height. Rendered two pixels per cell, so even values look best. */
  height: number
  /** Number of spiral arms (rotationally symmetric). Default 2, matching the mark. */
  arms?: number
  /** How many full turns each arm sweeps. Default 1.25. */
  turns?: number
  /** Stroke half-width in pixels (rounded caps). Default 1.05. */
  stroke?: number
  /** Inner radius as a fraction of the outer radius. Default 0.3. */
  rMinFactor?: number
  /** Samples per arm. Higher = smoother stroke. Default 260. */
  samples?: number
}

export interface SwirlGrid {
  width: number
  height: number
  /** Length width*height. Value is the reveal parameter t∈[0,1], or -1 if empty. */
  tGrid: Float32Array
}

export function buildSwirl(opts: SwirlOptions): SwirlGrid {
  const { width, height } = opts
  const arms = opts.arms ?? 2
  const turns = opts.turns ?? 1.25
  const stroke = opts.stroke ?? 1.05
  const rMinFactor = opts.rMinFactor ?? 0.3
  const samples = opts.samples ?? 260

  const tGrid = new Float32Array(width * height).fill(-1)
  const cx = (width - 1) / 2
  const cy = (height - 1) / 2
  const rMax = Math.min(width, height) / 2 - stroke - 0.5
  const rMin = rMax * rMinFactor
  const stampR = Math.ceil(stroke)

  for (let a = 0; a < arms; a++) {
    const armPhase = (a / arms) * Math.PI * 2
    for (let s = 0; s <= samples; s++) {
      const t = s / samples
      const theta = t * turns * Math.PI * 2 + armPhase
      // True logarithmic spiral: r grows geometrically with the angle.
      const r = rMin * Math.pow(rMax / rMin, t)
      const px = cx + r * Math.cos(theta)
      const py = cy + r * Math.sin(theta)

      // Stamp a filled disc so the stroke has body and rounded caps.
      for (let dy = -stampR; dy <= stampR; dy++) {
        for (let dx = -stampR; dx <= stampR; dx++) {
          if (dx * dx + dy * dy > stroke * stroke) continue
          const ix = Math.round(px) + dx
          const iy = Math.round(py) + dy
          if (ix < 0 || ix >= width || iy < 0 || iy >= height) continue
          const idx = iy * width + ix
          if (tGrid[idx]! < 0 || t < tGrid[idx]!) tGrid[idx] = t
        }
      }
    }
  }

  return { width, height, tGrid }
}

const TOP = "▀" // ▀ upper half block
const BOTTOM = "▄" // ▄ lower half block
const FULL = "█" // █ full block
const EMPTY = " "

/**
 * Render the swirl at a given trace progress into rows of half-block glyphs.
 * Each output row packs two pixel rows (top/bottom) into one character cell.
 * A single foreground color is used for the stroke; empty halves fall through
 * to the caller's background.
 */
export function renderSwirl(grid: SwirlGrid, progress: number): string[] {
  const { width, height, tGrid } = grid
  const cellRows = Math.floor(height / 2)
  const rows: string[] = []

  const on = (x: number, y: number): boolean => {
    const t = tGrid[y * width + x]!
    return t >= 0 && t <= progress
  }

  for (let cy = 0; cy < cellRows; cy++) {
    let row = ""
    for (let x = 0; x < width; x++) {
      const top = on(x, cy * 2)
      const bottom = on(x, cy * 2 + 1)
      row += top && bottom ? FULL : top ? TOP : bottom ? BOTTOM : EMPTY
    }
    rows.push(row)
  }

  return rows
}
