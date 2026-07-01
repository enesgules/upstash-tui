import { TextAttributes } from "@opentui/core"
import { productColors } from "../../theme.ts"

export function ProdPackBadge({ active }: { active: boolean }) {
  return active ? (
    <text fg={productColors.workflow} attributes={TextAttributes.BOLD}>
      ✓ Prod Pack enabled
    </text>
  ) : (
    <text fg={productColors.workflow} attributes={TextAttributes.BOLD | TextAttributes.UNDERLINE}>
      ✗ Prod Pack not enabled
    </text>
  )
}
