import { useState } from "react"
import { useKeyboard } from "@opentui/react"
import { theme, layout } from "../../theme.ts"
import { databases, redisSummary } from "../../mock.ts"
import { ProductNav } from "../components/ProductNav.tsx"
import { SummaryCard } from "../components/SummaryCard.tsx"
import { ResourceList } from "../components/ResourceList.tsx"
import { DetailsPanel } from "../components/DetailsPanel.tsx"
import { CommandBar } from "../components/CommandBar.tsx"

export function RedisDashboard() {
  const [selectedIndex, setSelectedIndex] = useState(0)

  useKeyboard((key) => {
    if (key.name === "up" || key.name === "k") {
      setSelectedIndex((i: number) => Math.max(0, i - 1))
    } else if (key.name === "down" || key.name === "j") {
      setSelectedIndex((i: number) => Math.min(databases.length - 1, i + 1))
    }
  })

  const selected = databases[selectedIndex]!

  return (
    <box
      style={{
        flexDirection: "column",
        width: "100%",
        height: "100%",
        backgroundColor: theme.bg,
        padding: layout.pad,
        gap: layout.gap,
      }}
    >
      <ProductNav activeKey="redis" />
      <SummaryCard
        commands={redisSummary.commands}
        storageBytes={redisSummary.storageBytes}
        cost={redisSummary.cost}
      />
      <box style={{ flexDirection: "row", gap: layout.gap, flexGrow: 1 }}>
        <ResourceList databases={databases} selectedId={selected.id} />
        <DetailsPanel db={selected} />
      </box>
      <CommandBar />
    </box>
  )
}
