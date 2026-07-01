// The Upstash icon, rasterized from its actual SVG (upstash-icon-dark-bg.svg).
// The mark is two concentric broken rings (an outer and inner crescent, openings
// on opposite sides) — that nested-crescent pairing is what reads as the swirl.
// Pure geometry (no React, no color types), so it can be unit-tested in isolation.
//
// Each SVG path is flattened to a polygon and point-in-polygon filled into a
// pixel grid. The paths' true bounding box (taller than wide — ~88×118) is fit
// into the grid preserving aspect, so nothing clips. Every covered pixel records
// its tone (0 = green, 1 = light mint, from the SVG's white-over-green overlay)
// and a spiral reveal parameter `t ∈ [0, 1]`: t = θ + turns·(r/maxR), which
// unwinds outward from the center so the trace animation draws the stroke on,
// pen-style, rather than expanding as flat rings.

interface MarkPath {
  d: string
  /** true for the #fff-over-green overlay paths → the lighter tone. */
  light: boolean
}

// Verbatim path data from the official SVG (viewBox 118×118, center 59,59).
const PATHS: MarkPath[] = [
  {
    d: "M15.105 103.244c19.416 19.526 50.895 19.526 70.311 0 19.416-19.526 19.416-51.185 0-70.711l-8.789 8.839c14.562 14.645 14.562 38.388 0 53.033-14.562 14.644-38.171 14.644-52.733 0l-8.789 8.839Z",
    light: false,
  },
  {
    d: "M32.683 85.566c9.708 9.763 25.447 9.763 35.155 0 9.708-9.763 9.708-25.592 0-35.355L59.05 59.05c4.854 4.881 4.854 12.796 0 17.677a12.38 12.38 0 0 1-17.578 0l-8.79 8.839Z",
    light: false,
  },
  {
    d: "M102.994 14.855c-19.416-19.526-50.895-19.526-70.311 0-19.416 19.527-19.416 51.185 0 70.711l8.788-8.839c-14.561-14.645-14.561-38.388 0-53.033 14.562-14.644 38.172-14.644 52.734 0l8.789-8.839Z",
    light: false,
  },
  {
    d: "M85.416 32.533c-9.708-9.763-25.448-9.763-35.156 0-9.708 9.763-9.708 25.592 0 35.355l8.79-8.839c-4.855-4.881-4.855-12.795 0-17.677a12.38 12.38 0 0 1 17.577 0l8.789-8.839Z",
    light: false,
  },
  {
    d: "M102.994 14.855c-19.416-19.526-50.896-19.526-70.312 0-19.416 19.527-19.416 51.185 0 70.711l8.79-8.839c-14.563-14.645-14.563-38.388 0-53.033 14.561-14.644 38.17-14.644 52.732 0l8.79-8.839Z",
    light: true,
  },
  {
    d: "M85.416 32.533c-9.708-9.763-25.448-9.763-35.156 0-9.708 9.763-9.708 25.592 0 35.355l8.79-8.839c-4.855-4.881-4.855-12.795 0-17.677a12.38 12.38 0 0 1 17.577 0l8.789-8.839Z",
    light: true,
  },
]

const BEZIER_STEPS = 18
// Fraction of extra breathing room around the mark's bounding box.
const PADDING = 0.06
// Spiral reveal shape: how many turns the trace unwinds, and its direction.
const SPIRAL_TURNS = 1.5
const SPIRAL_DIR = 0.2

type Point = [number, number]

// Flatten one SVG path's commands (M, C/c, L/l, A/a, Z) into a polygon. Arcs are
// approximated by their endpoint — the rounded caps they describe are sub-pixel
// at our resolution, so a straight segment is indistinguishable.
function flattenPath(d: string): Point[] {
  const toks = d.match(/[a-zA-Z]|-?\d*\.?\d+/g) ?? []
  const pts: Point[] = []
  let i = 0
  let cx = 0
  let cy = 0
  let sx = 0
  let sy = 0
  let cmd = ""
  const num = () => parseFloat(toks[i++]!)
  const cubic = (x1: number, y1: number, x2: number, y2: number, x3: number, y3: number) => {
    const x0 = cx
    const y0 = cy
    for (let s = 1; s <= BEZIER_STEPS; s++) {
      const t = s / BEZIER_STEPS
      const u = 1 - t
      pts.push([
        u * u * u * x0 + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * x3,
        u * u * u * y0 + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y3,
      ])
    }
    cx = x3
    cy = y3
  }
  while (i < toks.length) {
    if (/[a-zA-Z]/.test(toks[i]!)) cmd = toks[i++]!
    if (cmd === "M") {
      cx = num()
      cy = num()
      sx = cx
      sy = cy
      pts.push([cx, cy])
    } else if (cmd === "c") {
      cubic(cx + num(), cy + num(), cx + num(), cy + num(), cx + num(), cy + num())
    } else if (cmd === "C") {
      cubic(num(), num(), num(), num(), num(), num())
    } else if (cmd === "l") {
      cx += num()
      cy += num()
      pts.push([cx, cy])
    } else if (cmd === "L") {
      cx = num()
      cy = num()
      pts.push([cx, cy])
    } else if (cmd === "a") {
      num(), num(), num(), num(), num()
      cx += num()
      cy += num()
      pts.push([cx, cy])
    } else if (cmd === "A") {
      num(), num(), num(), num(), num()
      cx = num()
      cy = num()
      pts.push([cx, cy])
    } else if (cmd === "Z" || cmd === "z") {
      cx = sx
      cy = sy
    } else {
      i++
    }
  }
  return pts
}

const POLYS = PATHS.map((p) => ({ poly: flattenPath(p.d), light: p.light }))

// The mark's true bounding box, computed from the flattened geometry (not the
// square viewBox — the arcs bulge to the top and bottom of the canvas).
const BBOX = (() => {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const { poly } of POLYS) {
    for (const [x, y] of poly) {
      if (x < minX) minX = x
      if (y < minY) minY = y
      if (x > maxX) maxX = x
      if (y > maxY) maxY = y
    }
  }
  return { cx: (minX + maxX) / 2, cy: (minY + maxY) / 2, w: maxX - minX, h: maxY - minY }
})()

function pointInPolygon(poly: Point[], x: number, y: number): boolean {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i]!
    const [xj, yj] = poly[j]!
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

export interface SwirlOptions {
  /** Pixel grid width. */
  width: number
  /** Pixel grid height. Rendered two pixels per cell, so even values look best. */
  height: number
}

export interface SwirlGrid {
  width: number
  height: number
  /** Length width*height. Tone: 0 = green, 1 = light, or -1 if empty. */
  toneGrid: Int8Array
  /** Length width*height. Spiral reveal parameter t∈[0,1] (center → outer edge), or -1 if empty. */
  tGrid: Float32Array
}

export function buildSwirl(opts: SwirlOptions): SwirlGrid {
  const { width, height } = opts
  const toneGrid = new Int8Array(width * height).fill(-1)
  const tGrid = new Float32Array(width * height).fill(-1)
  const gcx = (width - 1) / 2
  const gcy = (height - 1) / 2

  // Fit the mark's bounding box into the grid preserving aspect ratio, centered.
  const scale = Math.min(width / (BBOX.w * (1 + PADDING)), height / (BBOX.h * (1 + PADDING)))
  const maxR = Math.hypot(gcx, gcy)

  // Pass 1: fill tone and accumulate the spiral parameter (unnormalized).
  let tMin = Infinity
  let tMax = -Infinity
  for (let gy = 0; gy < height; gy++) {
    for (let gx = 0; gx < width; gx++) {
      // Grid pixel → SVG coordinate (inverse of the aspect-preserving fit).
      const sx = BBOX.cx + (gx - gcx) / scale
      const sy = BBOX.cy + (gy - gcy) / scale
      let tone = -1
      // Later paths (the light overlay) win, matching SVG paint order.
      for (const { poly, light } of POLYS) {
        if (pointInPolygon(poly, sx, sy)) tone = light ? 1 : 0
      }
      if (tone < 0) continue
      const idx = gy * width + gx
      toneGrid[idx] = tone
      // Spiral order: angle plus a radius-scaled winding, so t increases as the
      // stroke unwinds from the center outward.
      const dx = gx - gcx
      const dy = gy - gcy
      let theta = Math.atan2(SPIRAL_DIR * dy, dx)
      if (theta < 0) theta += Math.PI * 2
      const t = theta + Math.PI * 2 * SPIRAL_TURNS * (Math.hypot(dx, dy) / maxR)
      tGrid[idx] = t
      if (t < tMin) tMin = t
      if (t > tMax) tMax = t
    }
  }

  // Pass 2: normalize the spiral parameter into [0, 1] (clamped against float noise).
  const span = tMax - tMin || 1
  for (let i = 0; i < tGrid.length; i++) {
    if (toneGrid[i]! >= 0) tGrid[i] = Math.min(1, Math.max(0, (tGrid[i]! - tMin) / span))
  }

  return { width, height, toneGrid, tGrid }
}

/**
 * One character cell of the rendered mark. Each cell packs two vertical pixels
 * (top/bottom half-blocks). `top`/`bottom` hold that half's tone (0 = green,
 * 1 = light), or -1 if the half is empty at the current progress.
 */
export interface SwirlCell {
  char: string
  top: number
  bottom: number
}

const TOP = "▀" // ▀ upper half block — fg paints top, bg paints bottom
const BOTTOM = "▄" // ▄ lower half block — fg paints bottom
const EMPTY = " "

/**
 * Render the mark at a given trace progress into rows of cells. A half is "on"
 * only if its pixel's reveal `t <= progress`, so the stroke unwinds from the center.
 */
export function renderSwirl(grid: SwirlGrid, progress: number): SwirlCell[][] {
  const { width, height, toneGrid, tGrid } = grid
  const cellRows = Math.floor(height / 2)
  const rows: SwirlCell[][] = []

  // Tone if the pixel is covered and revealed, else -1.
  const tone = (x: number, y: number): number => {
    const i = y * width + x
    const t = tGrid[i]!
    return t >= 0 && t <= progress ? toneGrid[i]! : -1
  }

  for (let cy = 0; cy < cellRows; cy++) {
    const row: SwirlCell[] = []
    for (let x = 0; x < width; x++) {
      const top = tone(x, cy * 2)
      const bottom = tone(x, cy * 2 + 1)
      // TOP glyph carries top in fg + bottom in bg, so it renders both halves
      // whether one or both are on. BOTTOM glyph is only needed when top is off.
      const char = top >= 0 ? TOP : bottom >= 0 ? BOTTOM : EMPTY
      row.push({ char, top, bottom })
    }
    rows.push(row)
  }

  return rows
}
