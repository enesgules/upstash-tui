import { createCliRenderer } from "@opentui/core"
import { createRoot } from "@opentui/react"

function App() {
  return (
    <box
      style={{
        border: true,
        borderStyle: "rounded",
        borderColor: "#00E9A3",
        padding: 1,
        flexDirection: "column",
        gap: 1,
      }}
    >
      <text fg="#00E9A3">Upstash TUI</text>
      <text>Built with OpenTUI + React.</text>
      <text fg="#888888">Press Ctrl+C to exit.</text>
    </box>
  )
}

const renderer = await createCliRenderer({ exitOnCtrlC: true })
createRoot(renderer).render(<App />)
