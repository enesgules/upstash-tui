import { TextAttributes } from "@opentui/core"
import { theme } from "../../theme.ts"

export function EnterpriseNudge() {
  return (
    <text fg={theme.warn} attributes={TextAttributes.BOLD}>
      ◆ Enterprise — dedicated · HIPAA · SSO  →  Request
    </text>
  )
}
