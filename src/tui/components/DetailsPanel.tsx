import { theme } from "../../theme.ts"
import { formatBudget, formatCount, formatStorage } from "../../format.ts"
import type { RedisDatabase } from "../../types.ts"

function Row({ label, value }: { label: string; value: string }) {
  return (
    <box style={{ flexDirection: "row" }}>
      <text fg={theme.textDim}>{label.padEnd(12)}</text>
      <text fg={theme.textBright}>{value}</text>
    </box>
  )
}

export function DetailsPanel({ db }: { db: RedisDatabase }) {
  return (
    <box
      title={db.name}
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
      <text fg={theme.textDim}>{`${db.plan} · ${db.provider} · ${db.region}`}</text>
      <box style={{ flexDirection: "column", marginTop: 1 }}>
        <Row label="Commands" value={formatCount(db.commands.used, db.commands.limit)} />
        <Row label="Storage" value={formatStorage(db.storage.usedBytes, db.storage.limitBytes)} />
        <Row label="Cost" value={formatBudget(db.cost.current, db.cost.budget)} />
      </box>
    </box>
  )
}
