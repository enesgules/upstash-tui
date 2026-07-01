import { expect, test } from "bun:test"
import {
  formatCompactNumber,
  formatBytes,
  formatCost,
  formatCount,
  formatStorage,
  formatBudget,
} from "./format.ts"

test("formatCompactNumber", () => {
  expect(formatCompactNumber(999)).toBe("999")
  expect(formatCompactNumber(2_000_000)).toBe("2M")
  expect(formatCompactNumber(12_400_000)).toBe("12M")
  expect(formatCompactNumber(45_000_000)).toBe("45M")
  expect(formatCompactNumber(1_500)).toBe("1.5K")
  expect(formatCompactNumber(3_200_000_000)).toBe("3.2B")
})

test("formatBytes", () => {
  expect(formatBytes(512)).toBe("512 B")
  expect(formatBytes(3 * 1024 ** 3)).toBe("3 GB")
  expect(formatBytes(100 * 1024 ** 3)).toBe("100 GB")
})

test("formatCost", () => {
  expect(formatCost(41.2)).toBe("$41.20")
  expect(formatCost(4.14)).toBe("$4.14")
})

test("formatCount", () => {
  expect(formatCount(2_000_000, null)).toBe("2M / Unlimited")
  expect(formatCount(2_000_000, 10_000_000)).toBe("2M / 10M")
})

test("formatStorage", () => {
  expect(formatStorage(3 * 1024 ** 3, 100 * 1024 ** 3)).toBe("3 GB / 100 GB")
  expect(formatStorage(3 * 1024 ** 3, null)).toBe("3 GB / Unlimited")
})

test("formatBudget", () => {
  expect(formatBudget(4.14, 5000)).toBe("$4.14 / $5000.00")
  expect(formatBudget(4.14, null)).toBe("$4.14 / No budget")
})
