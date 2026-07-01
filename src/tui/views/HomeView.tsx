import { useEffect, useRef, useState } from "react"
import { useKeyboard } from "@opentui/react"
import { TextAttributes } from "@opentui/core"
import { theme } from "../../theme.ts"
import { products, type Product, type ProductKey } from "../../products.ts"
import { shimmerFrame } from "../anim/shimmer.ts"
import { SwirlLogo } from "../components/SwirlLogo.tsx"

const COLUMNS = 2
const SHIMMER_MS = 80

function ProductCard({ product, selected, frame }: { product: Product; selected: boolean; frame: number }) {
  // The selected card's tagline comes alive: a bright band sweeps across it in
  // the product's brand color, rendered one <text> per char so each can tint.
  const cells = selected
    ? shimmerFrame(product.tagline, frame, { base: product.color, highlight: theme.textBright })
    : null

  return (
    <box
      title={`${product.glyph} ${product.name}`}
      titleColor={product.color}
      style={{
        border: true,
        borderStyle: "rounded",
        borderColor: selected ? product.color : theme.border,
        backgroundColor: theme.bgPanel,
        width: 36,
        height: 6,
        paddingLeft: 2,
        paddingRight: 2,
        flexDirection: "column",
        justifyContent: "center",
      }}
    >
      {cells ? (
        <text>
          {cells.map((cell, i) => (
            <span key={i} fg={cell.color}>
              {cell.char}
            </span>
          ))}
        </text>
      ) : (
        <text fg={theme.textDim}>{product.tagline}</text>
      )}
      {/* Always reserve this second row so the tagline never shifts when a card
          is selected — only the row's content changes (blank ↔ action hint).
          Coming-soon is the exception, flagged on every state. */}
      {product.enabled ? (
        <text fg={product.color}>{selected ? "↵ open" : " "}</text>
      ) : (
        <text fg={theme.textFaint} attributes={selected ? TextAttributes.BOLD : 0}>
          ○ Coming soon
        </text>
      )}
    </box>
  )
}

export function HomeView({ onOpen }: { onOpen: (key: ProductKey) => void }) {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [frame, setFrame] = useState(0)
  const lastIndex = products.length - 1
  // Mirror the selection in a ref so Enter always opens the highlighted card,
  // even when a move key and Enter arrive in the same tick (batched events).
  const indexRef = useRef(0)

  // Drive the selected card's tagline shimmer from a single interval.
  useEffect(() => {
    const id = setInterval(() => setFrame((f) => f + 1), SHIMMER_MS)
    return () => clearInterval(id)
  }, [])

  const move = (next: (i: number) => number) => {
    // Read/write the ref synchronously so rapid consecutive key events (and a
    // following Enter) all see the up-to-date selection, not batched state.
    const clamped = Math.max(0, Math.min(lastIndex, next(indexRef.current)))
    indexRef.current = clamped
    setSelectedIndex(clamped)
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
      <box style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
        <SwirlLogo width={18} height={24} />
        <ascii-font text="UPSTASH" font="block" color={[theme.accent, theme.accentLight]} />
      </box>

      <box style={{ flexDirection: "column", alignItems: "center", gap: 1, marginTop: 1 }}>
        {rows.map((row, r) => (
          <box key={r} style={{ flexDirection: "row", gap: 2 }}>
            {row.map((p) => (
              <ProductCard
                key={p.key}
                product={p}
                selected={p.key === products[selectedIndex]!.key}
                frame={frame}
              />
            ))}
          </box>
        ))}
      </box>

      <text fg={theme.textFaint} attributes={TextAttributes.DIM}>
        ↑ ↓ ← → navigate · ↵ open · ctrl+c quit
      </text>
    </box>
  )
}
