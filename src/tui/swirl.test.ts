import { test, expect } from "bun:test"
import { buildSwirl, renderSwirl } from "./swirl.ts"

test("every covered pixel carries a tone (0 or 1) and a reveal t in [0, 1]", () => {
  const { toneGrid, tGrid } = buildSwirl({ width: 32, height: 32 })
  let covered = 0
  for (let i = 0; i < toneGrid.length; i++) {
    if (toneGrid[i]! < 0) continue
    covered++
    expect(toneGrid[i] === 0 || toneGrid[i] === 1).toBe(true)
    expect(tGrid[i]).toBeGreaterThanOrEqual(0)
    expect(tGrid[i]).toBeLessThanOrEqual(1)
  }
  expect(covered).toBeGreaterThan(0)
})

test("grids match the requested dimensions", () => {
  const width = 32
  const height = 32
  const { toneGrid, tGrid } = buildSwirl({ width, height })
  expect(toneGrid.length).toBe(width * height)
  expect(tGrid.length).toBe(width * height)
})

test("the mark's shape is 180° rotationally symmetric about the center", () => {
  const width = 32
  const height = 32
  const { toneGrid } = buildSwirl({ width, height })
  const covered = (x: number, y: number) => toneGrid[y * width + x]! >= 0
  const coveredNear = (x: number, y: number) => {
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx
        const ny = y + dy
        if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue
        if (covered(nx, ny)) return true
      }
    return false
  }

  let checked = 0
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!covered(x, y)) continue
      // Rasterization can nudge the reflected pixel by up to one cell.
      expect(coveredNear(width - 1 - x, height - 1 - y)).toBe(true)
      checked++
    }
  }
  expect(checked).toBeGreaterThan(0)
})

test("both tones are present (the two-tone split)", () => {
  const { toneGrid } = buildSwirl({ width: 32, height: 32 })
  let green = 0
  let light = 0
  for (const v of toneGrid) {
    if (v === 0) green++
    else if (v === 1) light++
  }
  expect(green).toBeGreaterThan(0)
  expect(light).toBeGreaterThan(0)
})

test("progress gates the reveal: none at 0, some mid, all at 1", () => {
  const grid = buildSwirl({ width: 32, height: 32 })
  const lit = (rows: ReturnType<typeof renderSwirl>) =>
    rows.reduce((n, row) => n + row.filter((c) => c.top >= 0 || c.bottom >= 0).length, 0)

  expect(lit(renderSwirl(grid, 0))).toBeLessThan(lit(renderSwirl(grid, 0.5)))
  expect(lit(renderSwirl(grid, 0.5))).toBeLessThan(lit(renderSwirl(grid, 1)))
})

test("rendered rows are full width and count half the pixel height", () => {
  const grid = buildSwirl({ width: 18, height: 24 })
  const rows = renderSwirl(grid, 1)
  expect(rows.length).toBe(12)
  for (const row of rows) expect(row.length).toBe(18)
})

test("the spiral reveal starts at the center", () => {
  const width = 18
  const height = 24
  const grid = buildSwirl({ width, height })
  const cx = (width - 1) / 2
  const cy = (height - 1) / 2
  let markMaxR = 0
  let earlyMaxR = 0
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const t = grid.tGrid[y * width + x]!
      if (t < 0) continue
      const r = Math.hypot(x - cx, y - cy)
      markMaxR = Math.max(markMaxR, r)
      if (t <= 0.15) earlyMaxR = Math.max(earlyMaxR, r)
    }
  }
  // The first revealed pixels sit well inside the mark, not out at the rim.
  expect(earlyMaxR).toBeGreaterThan(0)
  expect(earlyMaxR).toBeLessThan(markMaxR * 0.75)
})

test("the mark fits inside the grid with no clipping", () => {
  const width = 18
  const height = 24
  const { toneGrid } = buildSwirl({ width, height })
  const covered = (x: number, y: number) => toneGrid[y * width + x]! >= 0
  // No covered pixel touches the grid border → nothing is cut off.
  for (let x = 0; x < width; x++) {
    expect(covered(x, 0)).toBe(false)
    expect(covered(x, height - 1)).toBe(false)
  }
  for (let y = 0; y < height; y++) {
    expect(covered(0, y)).toBe(false)
    expect(covered(width - 1, y)).toBe(false)
  }
})
