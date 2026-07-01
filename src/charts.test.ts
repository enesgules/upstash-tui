import { expect, test } from "bun:test"
import { sparkline, barChart, usageRatio, usageBar, usageLevel } from "./charts.ts"

test("sparkline maps an ascending series across the full block ramp", () => {
  expect(sparkline([0, 1, 2, 3, 4, 5, 6, 7], 8)).toBe("▁▂▃▄▅▆▇█")
})

test("sparkline renders a mid baseline for a flat series", () => {
  expect(sparkline([5, 5, 5], 3)).toBe("▄▄▄")
})

test("sparkline returns empty string for no data", () => {
  expect(sparkline([], 8)).toBe("")
})

test("sparkline downsamples to the requested width", () => {
  const values = Array.from({ length: 16 }, (_, i) => i)
  expect(sparkline(values, 8)).toHaveLength(8)
})

test("barChart returns height rows of width columns", () => {
  const rows = barChart([1, 2, 4], 3, 4)
  expect(rows).toHaveLength(4)
  expect(rows.every((r) => r.length === 3)).toBe(true)
})

test("barChart fills the max column to full height and blanks nothing below it", () => {
  const rows = barChart([1, 2, 4], 3, 4)
  // Column 2 holds the max value, so it is a solid block in every row.
  expect(rows.every((r) => r[2] === "█")).toBe(true)
  // Column 0 is the smallest, so the top row is blank there.
  expect(rows[0]?.[0]).toBe(" ")
})

test("barChart yields blank rows for no data", () => {
  expect(barChart([], 3, 4)).toEqual(["", "", "", ""])
})

test("usageRatio clamps and handles nulls", () => {
  expect(usageRatio(50, 100)).toBe(0.5)
  expect(usageRatio(150, 100)).toBe(1)
  expect(usageRatio(null, 100)).toBeNull()
  expect(usageRatio(50, null)).toBeNull()
  expect(usageRatio(50, 0)).toBeNull()
})

test("usageBar renders filled and empty cells", () => {
  expect(usageBar(0.5, 10)).toBe("▓▓▓▓▓░░░░░")
  expect(usageBar(0, 4)).toBe("░░░░")
  expect(usageBar(1, 4)).toBe("▓▓▓▓")
})

test("usageLevel thresholds at 0.75 and 0.90", () => {
  expect(usageLevel(0.74)).toBe("ok")
  expect(usageLevel(0.75)).toBe("warn")
  expect(usageLevel(0.9)).toBe("warn")
  expect(usageLevel(0.91)).toBe("danger")
})
