import { useRef, useState } from "react"
import { useKeyboard } from "@opentui/react"
import { TextAttributes } from "@opentui/core"
import { theme } from "../../theme.ts"
import { products, type Product, type ProductKey } from "../../products.ts"

const COLUMNS = 2

function ProductCard({ product, selected }: { product: Product; selected: boolean }) {
  return (
    <box
      title={product.name}
      titleColor={product.color}
      style={{
        border: true,
        borderStyle: "rounded",
        borderColor: selected ? product.color : theme.border,
        backgroundColor: theme.bgPanel,
        width: 32,
        height: 5,
        paddingLeft: 1,
        paddingRight: 1,
        flexDirection: "column",
        justifyContent: "center",
      }}
    >
      <text fg={selected ? theme.textBright : theme.textDim}>{product.tagline}</text>
      <text
        fg={product.enabled ? theme.accent : theme.textFaint}
        attributes={selected ? TextAttributes.BOLD : 0}
      >
        {product.enabled ? "● Available" : "○ Coming soon"}
      </text>
    </box>
  )
}

export function HomeView({ onOpen }: { onOpen: (key: ProductKey) => void }) {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const lastIndex = products.length - 1
  // Mirror the selection in a ref so Enter always opens the highlighted card,
  // even when a move key and Enter arrive in the same tick (batched events).
  const indexRef = useRef(0)

  const move = (next: (i: number) => number) => {
    setSelectedIndex((i) => {
      const clamped = Math.max(0, Math.min(lastIndex, next(i)))
      indexRef.current = clamped
      return clamped
    })
  }

  useKeyboard((key) => {
    if (key.name === "right" || key.name === "l") {
      move((i) => i + 1)
    } else if (key.name === "left" || key.name === "h") {
      move((i) => i - 1)
    } else if (key.name === "down" || key.name === "j") {
      move((i) => i + COLUMNS)
    } else if (key.name === "up" || key.name === "k") {
      move((i) => i - COLUMNS)
    } else if (key.name === "return" || key.name === "enter") {
      onOpen(products[indexRef.current]!.key)
    }
  })

  const rows: Product[][] = []
  for (let i = 0; i < products.length; i += COLUMNS) {
    rows.push(products.slice(i, i + COLUMNS))
  }

  return (
    <box
      style={{
        width: "100%",
        height: "100%",
        backgroundColor: theme.bg,
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        gap: 1,
      }}
    >
      <ascii-font text="UPSTASH" font="tiny" color={theme.accent} />
      <text fg={theme.textDim}>terminal-native console</text>

      <box style={{ flexDirection: "column", alignItems: "center", gap: 1, marginTop: 1 }}>
        {rows.map((row, r) => (
          <box key={r} style={{ flexDirection: "row", gap: 2 }}>
            {row.map((p) => (
              <ProductCard
                key={p.key}
                product={p}
                selected={p.key === products[selectedIndex]!.key}
              />
            ))}
          </box>
        ))}
      </box>

      <text fg={theme.textFaint} attributes={TextAttributes.DIM}>
        ↑ ↓ ← → navigate · enter open · ctrl+c quit
      </text>
    </box>
  )
}
