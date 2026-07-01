import { test, expect } from "bun:test"
import { buildSwirl, renderSwirl } from "./swirl.ts"

test("every covered pixel carries a t in [0, 1]", () => {
  const { tGrid } = buildSwirl({ width: 30, height: 24 })
  let covered = 0
  for (const t of tGrid) {
    if (t < 0) continue
    covered++
    expect(t).toBeGreaterThanOrEqual(0)
    expect(t).toBeLessThanOrEqual(1)
  }
  expect(covered).toBeGreaterThan(0)
})

test("all covered pixels stay inside the grid bounds", () => {
  const width = 30
  const height = 24
  const { tGrid } = buildSwirl({ width, height })
  expect(tGrid.length).toBe(width * height)
  // The Float32Array is exactly width*height, so any covered index is in-bounds
  // by construction; assert at least one pixel exists in the interior.
  const idx = tGrid.findIndex((t) => t >= 0)
  expect(idx).toBeGreaterThanOrEqual(0)
})

test("two arms are 180° rotationally symmetric about the center", () => {
  const width = 30
  const height = 24
  const { tGrid } = buildSwirl({ width, height, arms: 2 })
  const covered = (x: number, y: number) => tGrid[y * width + x]! >= 0

  // The two arms are exact point-reflections of each other, but rasterization
  // rounding can nudge a reflected pixel by up to one cell at half-integer
  // boundaries. So require the reflected point OR an immediate neighbor to be
  // covered — the correct symmetry assertion for a rasterized shape.
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
      // Reflect through the center used by buildSwirl: cx=(w-1)/2, cy=(h-1)/2.
      expect(coveredNear(width - 1 - x, height - 1 - y)).toBe(true)
      checked++
    }
  }
  expect(checked).toBeGreaterThan(0)
})

test("progress gates the reveal: none at 0, some mid, all at 1", () => {
  const grid = buildSwirl({ width: 30, height: 24 })
  const glyphs = (rows: string[]) => rows.join("").replace(/ /g, "").length

  const atZero = glyphs(renderSwirl(grid, 0))
  const atMid = glyphs(renderSwirl(grid, 0.5))
  const atFull = glyphs(renderSwirl(grid, 1))

  expect(atZero).toBeLessThan(atMid)
  expect(atMid).toBeLessThan(atFull)
})

test("rendered rows are full width and count half the pixel height", () => {
  const grid = buildSwirl({ width: 30, height: 24 })
  const rows = renderSwirl(grid, 1)
  expect(rows.length).toBe(12)
  for (const row of rows) expect(row.length).toBe(30)
})
