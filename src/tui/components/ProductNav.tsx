import { TextAttributes } from "@opentui/core"
import { theme } from "../../theme.ts"

const PRODUCTS = [
  { name: "Redis", active: true, badge: "" },
  { name: "QStash", active: false, badge: "" },
  { name: "Workflow", active: false, badge: "" },
  { name: "Vector", active: false, badge: "" },
  { name: "Box", active: false, badge: "NEW" },
]

export function ProductNav() {
  return (
    <box
      title="Upstash"
      style={{
        border: true,
        borderStyle: "rounded",
        borderColor: theme.border,
        backgroundColor: theme.bgPanel,
        paddingLeft: 2,
        paddingRight: 2,
        flexDirection: "row",
        gap: 3,
      }}
    >
      {PRODUCTS.map((p) => (
        <text
          key={p.name}
          fg={p.active ? theme.accent : theme.textFaint}
          attributes={p.active ? TextAttributes.BOLD : 0}
        >
          {p.badge ? `${p.name} ${p.badge}` : p.name}
        </text>
      ))}
    </box>
  )
}
