import { useEffect, useMemo, useState } from "react"
import { theme } from "../../theme.ts"
import { buildSwirl, renderSwirl } from "../swirl.ts"

// Trace the swirl in only once per process. Navigating home → product → home
// finds this already true and renders the finished swirl instantly.
let hasTracedThisSession = false

const TRACE_MS = 800
const FRAME_MS = 1000 / 60

export function SwirlLogo({
  width = 30,
  height = 24,
  color = theme.accent,
  background = theme.bg,
}: {
  width?: number
  height?: number
  color?: string
  background?: string
}) {
  const grid = useMemo(() => buildSwirl({ width, height }), [width, height])
  const [progress, setProgress] = useState(hasTracedThisSession ? 1 : 0)

  useEffect(() => {
    if (hasTracedThisSession) return
    const start = Date.now()
    const id = setInterval(() => {
      const p = Math.min(1, (Date.now() - start) / TRACE_MS)
      setProgress(p)
      if (p >= 1) {
        hasTracedThisSession = true
        clearInterval(id)
      }
    }, FRAME_MS)
    return () => clearInterval(id)
  }, [])

  const rows = useMemo(() => renderSwirl(grid, progress), [grid, progress])

  return (
    <box style={{ flexDirection: "column", alignItems: "center" }}>
      {rows.map((row, i) => (
        <text key={i} fg={color} bg={background} selectable={false}>
          {row}
        </text>
      ))}
    </box>
  )
}
