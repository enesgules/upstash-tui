import { useEffect, useMemo, useState } from "react"
import { StyledText, fg, bg, type TextChunk } from "@opentui/core"
import { theme } from "../../theme.ts"
import { buildSwirl, renderSwirl } from "../swirl.ts"

// Trace the swirl in only once per process. Navigating home → product → home
// finds this already true and renders the finished swirl instantly.
let hasTracedThisSession = false

const TRACE_MS = 900
const FRAME_MS = 1000 / 60

export function SwirlLogo({
  width = 18,
  height = 24,
  // Tone 0 = green, tone 1 = light mint (the SVG's #fff-over-green overlay,
  // which composites to exactly theme.accentLight).
  colors = [theme.accent, theme.accentLight],
  background = theme.bg,
}: {
  width?: number
  height?: number
  colors?: [string, string]
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

  // Each row becomes a StyledText: the top half-block is painted via fg, the
  // bottom half via bg, so a single cell can show both tones at once.
  const rows = useMemo(() => {
    return renderSwirl(grid, progress).map((cells) => {
      const chunks: TextChunk[] = cells.map((cell) => {
        if (cell.top >= 0) {
          const bottom = cell.bottom >= 0 ? colors[cell.bottom]! : background
          return bg(bottom)(fg(colors[cell.top]!)(cell.char))
        }
        if (cell.bottom >= 0) {
          return bg(background)(fg(colors[cell.bottom]!)(cell.char))
        }
        return bg(background)(" ")
      })
      return new StyledText(chunks)
    })
  }, [grid, progress, colors, background])

  return (
    <box style={{ flexDirection: "column", alignItems: "center" }}>
      {rows.map((row, i) => (
        <text key={i} content={row} bg={background} selectable={false} />
      ))}
    </box>
  )
}
