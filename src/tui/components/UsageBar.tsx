import { theme } from "../../theme.ts"
import { usageRatio, usageBar, usageLevel, type UsageLevel } from "../../charts.ts"

const LEVEL_COLOR: Record<UsageLevel, string> = {
  ok: theme.accent,
  warn: theme.warn,
  danger: theme.danger,
}

export function UsageBar({
  label,
  used,
  limit,
  format,
  width = 10,
}: {
  label: string
  used: number | null
  limit: number | null
  format: (used: number | null, limit: number | null) => string
  width?: number
}) {
  const ratio = usageRatio(used, limit)
  return (
    <box style={{ flexDirection: "row", gap: 1 }}>
      <text fg={theme.textDim}>{label.padEnd(9)}</text>
      <text fg={theme.textBright}>{format(used, limit).padEnd(18)}</text>
      {/* Only draw the bar when we actually know usage. An empty ░ track for
          unknown usage reads as "0% used", which is misleading. */}
      {ratio !== null ? (
        <text fg={LEVEL_COLOR[usageLevel(ratio)]}>{usageBar(ratio, width)}</text>
      ) : null}
    </box>
  )
}
