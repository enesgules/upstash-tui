import { theme, productColors } from "../../theme.ts"

export function ProdPackBadge({ active }: { active: boolean }) {
  return active ? (
    <text fg={productColors.workflow}>✓ Prod Pack</text>
  ) : (
    <text fg={theme.textFaint}>⚡ Enable Prod Pack</text>
  )
}
