import { TextAttributes } from "@opentui/core"
import { theme, layout } from "../../theme.ts"
import type { RedisDatabase } from "../../types.ts"
import { Sparkline } from "./Sparkline.tsx"

export function ResourceList({
  databases,
  selectedId,
}: {
  databases: RedisDatabase[]
  selectedId: string
}) {
  return (
    <box
      title="Databases"
      titleColor={theme.title}
      style={{
        border: true,
        borderStyle: "rounded",
        borderColor: theme.border,
        backgroundColor: theme.bgPanel,
        width: layout.listWidth,
        flexShrink: 0,
        flexDirection: "column",
        paddingLeft: 1,
        paddingRight: 1,
        paddingTop: 1,
      }}
    >
      <box
        style={{
          border: true,
          borderStyle: "single",
          borderColor: theme.borderSubtle,
          height: 3,
          marginBottom: 1,
        }}
      >
        <input
          placeholder="Search..."
          focused={false}
          textColor={theme.textBright}
          backgroundColor={theme.bgPanel}
        />
      </box>

      <box style={{ flexDirection: "column" }}>
        {databases.map((db) => {
          const selected = db.id === selectedId
          return (
            <box
              key={db.id}
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                backgroundColor: selected ? theme.accentDim : theme.bgPanel,
                paddingLeft: 1,
                paddingRight: 1,
              }}
            >
              <box style={{ flexDirection: "row", flexShrink: 1 }}>
                <text fg={db.pinned ? theme.accent : theme.textFaint}>
                  {db.pinned ? "★ " : "  "}
                </text>
                <text
                  fg={selected ? theme.textBright : theme.textDim}
                  attributes={selected ? TextAttributes.BOLD : 0}
                >
                  {db.name}
                </text>
              </box>
              <Sparkline values={db.stats?.throughput.map((p) => p.y) ?? []} width={7} />
            </box>
          )
        })}
      </box>
    </box>
  )
}
