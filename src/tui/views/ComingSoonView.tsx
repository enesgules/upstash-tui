import { useKeyboard } from "@opentui/react"
import { TextAttributes } from "@opentui/core"
import { theme, layout } from "../../theme.ts"
import { getProduct, type ProductKey } from "../../products.ts"
import { ProductNav } from "../components/ProductNav.tsx"

export function ComingSoonView({
  productKey,
  onBack,
  onCycle,
}: {
  productKey: ProductKey
  onBack: () => void
  onCycle: (delta: number) => void
}) {
  const product = getProduct(productKey)

  useKeyboard((key) => {
    if (key.name === "escape") onBack()
    else if (key.name === "tab") onCycle(key.shift ? -1 : 1)
  })

  return (
    <box
      style={{
        width: "100%",
        height: "100%",
        backgroundColor: theme.bg,
        flexDirection: "column",
        padding: layout.pad,
        gap: layout.gap,
      }}
    >
      <ProductNav activeKey={productKey} />

      <box
        style={{
          flexGrow: 1,
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          gap: 1,
        }}
      >
        <ascii-font text={product.name} font="tiny" color={product.color} />
        <text fg={theme.textDim}>{product.tagline}</text>
        <text fg={product.color} attributes={TextAttributes.BOLD}>
          Coming soon
        </text>
        <text fg={theme.textFaint}>Not available in upstash-tui yet.</text>
        <text fg={theme.textFaint}>Press Esc to go back home.</text>
      </box>
    </box>
  )
}
