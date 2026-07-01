export function formatCompactNumber(n: number): string {
  const units = [
    { v: 1e9, s: "B" },
    { v: 1e6, s: "M" },
    { v: 1e3, s: "K" },
  ]
  for (const u of units) {
    if (n >= u.v) {
      const val = n / u.v
      const rounded = val >= 10 ? Math.round(val) : Math.round(val * 10) / 10
      return `${rounded}${u.s}`
    }
  }
  return String(n)
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  const units = ["KB", "MB", "GB", "TB"]
  let val = bytes / 1024
  let i = 0
  while (val >= 1024 && i < units.length - 1) {
    val /= 1024
    i++
  }
  const rounded = val >= 10 ? Math.round(val) : Math.round(val * 10) / 10
  return `${rounded} ${units[i]}`
}

export function formatCost(dollars: number): string {
  return `$${dollars.toFixed(2)}`
}

export function formatCount(used: number, limit: number | null): string {
  const right = limit === null ? "Unlimited" : formatCompactNumber(limit)
  return `${formatCompactNumber(used)} / ${right}`
}

export function formatStorage(usedBytes: number, limitBytes: number | null): string {
  const right = limitBytes === null ? "Unlimited" : formatBytes(limitBytes)
  return `${formatBytes(usedBytes)} / ${right}`
}

export function formatBudget(current: number, budget: number | null): string {
  const right = budget === null ? "No budget" : formatCost(budget)
  return `${formatCost(current)} / ${right}`
}
