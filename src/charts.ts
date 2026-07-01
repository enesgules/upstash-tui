const BLOCKS = "▁▂▃▄▅▆▇█"

function downsample(values: number[], width: number): number[] {
  if (values.length <= width) return values
  const out: number[] = []
  const size = values.length / width
  for (let i = 0; i < width; i++) {
    const start = Math.floor(i * size)
    const end = Math.max(start + 1, Math.floor((i + 1) * size))
    const slice = values.slice(start, end)
    out.push(slice.reduce((s, v) => s + v, 0) / slice.length)
  }
  return out
}

export function sparkline(values: number[], width = 8): string {
  if (values.length === 0) return ""
  const pts = downsample(values, width)
  const min = Math.min(...pts)
  const max = Math.max(...pts)
  const range = max - min
  return pts
    .map((v) => {
      if (range === 0) return BLOCKS[3]
      const idx = Math.round(((v - min) / range) * (BLOCKS.length - 1))
      return BLOCKS[idx]
    })
    .join("")
}

export function usageRatio(used: number | null, limit: number | null): number | null {
  if (used === null || limit === null || limit <= 0) return null
  return Math.max(0, Math.min(1, used / limit))
}

export function usageBar(ratio: number, width = 8): string {
  const clamped = Math.max(0, Math.min(1, ratio))
  const filled = Math.round(clamped * width)
  return "▓".repeat(filled) + "░".repeat(width - filled)
}

export type UsageLevel = "ok" | "warn" | "danger"

export function usageLevel(ratio: number): UsageLevel {
  if (ratio > 0.9) return "danger"
  if (ratio >= 0.75) return "warn"
  return "ok"
}
