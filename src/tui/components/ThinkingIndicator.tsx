import { useEffect, useState } from "react"
import { theme } from "../../theme.ts"
import { shimmerFrame } from "../anim/shimmer.ts"

const VERBS = ["Thinking", "Planning", "Reasoning", "Consulting Upstash"]

const FRAME_MS = 80
const FRAMES_PER_VERB = 16 // ~1.3s on each verb before it rotates

// A Claude-Code-style "thinking" line: a bright band sweeps across the label
// while the verb rotates. Rendered as one <text> per character so each can
// carry its own shimmer color.
export function ThinkingIndicator() {
  const [frame, setFrame] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setFrame((f) => f + 1), FRAME_MS)
    return () => clearInterval(id)
  }, [])

  const verb = VERBS[Math.floor(frame / FRAMES_PER_VERB) % VERBS.length]!
  const cells = shimmerFrame(`${verb}…`, frame, {
    base: theme.accent,
    highlight: theme.accentLight,
  })

  return (
    <box style={{ flexDirection: "row" }}>
      {cells.map((cell, i) => (
        <text key={i} fg={cell.color}>
          {cell.char}
        </text>
      ))}
    </box>
  )
}
