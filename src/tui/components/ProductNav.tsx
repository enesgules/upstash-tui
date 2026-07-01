import { TextAttributes } from "@opentui/core"
import { theme } from "../../theme.ts"
import { products, type ProductKey } from "../../products.ts"

export function ProductNav({ activeKey }: { activeKey: ProductKey }) {
  return (
    <box
      title="Upstash"
      titleColor={theme.title}
      titleAlignment="center"
      style={{
        border: true,
        borderStyle: "rounded",
        borderColor: theme.border,
        backgroundColor: theme.bgPanel,
        paddingLeft: 2,
        paddingRight: 2,
        flexDirection: "row",
        justifyContent: "center",
        gap: 4,
      }}
    >
      {products.map((p) => {
        const active = p.key === activeKey
        return (
          <text
            key={p.key}
            fg={active ? p.color : theme.textFaint}
            attributes={active ? TextAttributes.BOLD : 0}
          >
            {p.name}
          </text>
        )
      })}
    </box>
  )
}
