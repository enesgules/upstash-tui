import { expect, test } from "bun:test"
import { shimmerFrame } from "./shimmer.ts"

test("returns one cell per character, preserving order", () => {
  const cells = shimmerFrame("Thinking", 0)
  expect(cells.map((c) => c.char).join("")).toBe("Thinking")
})

test("intensity always stays within [0, 1]", () => {
  for (let f = 0; f < 60; f++) {
    for (const c of shimmerFrame("Planning…", f)) {
      expect(c.intensity).toBeGreaterThanOrEqual(0)
      expect(c.intensity).toBeLessThanOrEqual(1)
    }
  }
})

test("the bright crest sweeps across the text as frames advance", () => {
  const brightestIndex = (frame: number) => {
    const cells = shimmerFrame("abcdefgh", frame)
    let best = 0
    cells.forEach((c, i) => {
      if (c.intensity > cells[best]!.intensity) best = i
    })
    return best
  }
  const visited = new Set<number>()
  for (let f = 0; f < 60; f++) visited.add(brightestIndex(f))
  // A moving highlight visits many positions; a static one would visit ~1.
  expect(visited.size).toBeGreaterThan(3)
})

test("every cell is a 6-digit hex color", () => {
  for (const c of shimmerFrame("hi there", 7)) {
    expect(c.color).toMatch(/^#[0-9a-fA-F]{6}$/)
  }
})

test("empty text yields no cells", () => {
  expect(shimmerFrame("", 3)).toEqual([])
})
