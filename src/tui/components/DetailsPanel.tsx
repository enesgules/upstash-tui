import { TextAttributes } from "@opentui/core"
import { theme } from "../../theme.ts"
import { formatBudget, formatCompactNumber, formatCount, formatStorage } from "../../format.ts"
import type { RedisDatabase } from "../../types.ts"
import { UsageBar } from "./UsageBar.tsx"
import { BarChart } from "./BarChart.tsx"
import { ProdPackBadge } from "./ProdPackBadge.tsx"
import { EnterpriseNudge } from "./EnterpriseNudge.tsx"

function SectionLabel({ text }: { text: string }) {
  return (
    <text fg={theme.textFaint} attributes={TextAttributes.BOLD}>
      {text}
    </text>
  )
}

export function DetailsPanel({ db }: { db: RedisDatabase }) {
  const throughput = db.stats?.throughput.map((p) => p.y) ?? []
  const peak = throughput.length > 0 ? Math.max(...throughput) : 0
  const avg =
    throughput.length > 0
      ? Math.round(throughput.reduce((s, v) => s + v, 0) / throughput.length)
      : 0

  return (
    <box
      title={db.name}
      titleColor={theme.accent}
      style={{
        border: true,
        borderStyle: "rounded",
        borderColor: theme.border,
        backgroundColor: theme.bgPanel,
        flexGrow: 1,
        flexDirection: "column",
        padding: 1,
        gap: 1,
      }}
    >
      <text fg={theme.textDim}>{`${db.plan} · ${db.provider} · ${db.region}`}</text>

      {/* Usage */}
      <box style={{ flexDirection: "column" }}>
        <SectionLabel text="USAGE" />
        <UsageBar label="Commands" used={db.commands.used} limit={db.commands.limit} format={formatCount} />
        <UsageBar label="Storage" used={db.storage.usedBytes} limit={db.storage.limitBytes} format={formatStorage} />
        <UsageBar label="Cost" used={db.cost.current} limit={db.cost.budget} format={formatBudget} />
        <box style={{ flexDirection: "row" }}>
          <text fg={theme.textDim}>{"Eviction".padEnd(9)}</text>
          <text fg={theme.textBright}>{db.eviction ? "Enabled" : "Disabled"}</text>
        </box>
      </box>

      {/* Activity */}
      <box style={{ flexDirection: "column" }}>
        <box style={{ flexDirection: "row", gap: 2 }}>
          <SectionLabel text="THROUGHPUT" />
          {throughput.length > 0 ? (
            <text fg={theme.textFaint}>{`peak ${formatCompactNumber(peak)} · avg ${formatCompactNumber(avg)} ops/s`}</text>
          ) : null}
        </box>
        {throughput.length > 0 ? (
          <BarChart values={throughput} width={48} height={7} />
        ) : (
          <text fg={theme.textFaint}>no recent activity</text>
        )}
      </box>

      {/* Spacer pushes the upgrade card to the bottom of the tall panel. */}
      <box style={{ flexGrow: 1 }} />

      {/* Plan / upgrade — deliberately prominent. */}
      <box
        title="Plan"
        titleColor={theme.warn}
        style={{
          border: true,
          borderStyle: "rounded",
          borderColor: theme.border,
          flexDirection: "column",
          gap: 1,
          paddingLeft: 1,
          paddingRight: 1,
        }}
      >
        <ProdPackBadge active={db.prodPack} />
        <EnterpriseNudge />
      </box>
    </box>
  )
}
