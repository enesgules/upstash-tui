import { theme } from "../../theme.ts"
import { formatBudget, formatCount, formatStorage } from "../../format.ts"
import type { RedisDatabase } from "../../types.ts"
import { UsageBar } from "./UsageBar.tsx"
import { Sparkline } from "./Sparkline.tsx"
import { ProdPackBadge } from "./ProdPackBadge.tsx"
import { EnterpriseNudge } from "./EnterpriseNudge.tsx"

export function DetailsPanel({ db }: { db: RedisDatabase }) {
  const throughput = db.stats?.throughput.map((p) => p.y) ?? []
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
      }}
    >
      <box style={{ flexDirection: "row", gap: 2 }}>
        <text fg={theme.textDim}>{`${db.plan} · ${db.provider} · ${db.region}`}</text>
        {db.synthetic ? <text fg={theme.textFaint}>~ sample metrics</text> : null}
      </box>
      <box style={{ flexDirection: "column", marginTop: 1 }}>
        <UsageBar label="Commands" used={db.commands.used} limit={db.commands.limit} format={formatCount} />
        <UsageBar label="Storage" used={db.storage.usedBytes} limit={db.storage.limitBytes} format={formatStorage} />
        <UsageBar label="Cost" used={db.cost.current} limit={db.cost.budget} format={formatBudget} />
        <box style={{ flexDirection: "row" }}>
          <text fg={theme.textDim}>{"Eviction".padEnd(9)}</text>
          <text fg={theme.textBright}>{db.eviction ? "Enabled" : "Disabled"}</text>
        </box>
      </box>
      <box style={{ flexDirection: "row", gap: 1, marginTop: 1 }}>
        <text fg={theme.textDim}>Throughput</text>
        {throughput.length > 0 ? (
          <Sparkline values={throughput} width={24} />
        ) : (
          <text fg={theme.textFaint}>no recent activity</text>
        )}
      </box>
      <box style={{ flexDirection: "row", gap: 3, marginTop: 1 }}>
        <ProdPackBadge active={db.prodPack} />
        <EnterpriseNudge />
      </box>
    </box>
  )
}
