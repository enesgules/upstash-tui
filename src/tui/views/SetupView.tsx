import { useKeyboard } from "@opentui/react"
import { TextAttributes } from "@opentui/core"
import { theme } from "../../theme.ts"

const REQUIRED_VARS = ["UPSTASH_EMAIL", "UPSTASH_API_KEY"] as const

export function SetupView({
  missing,
  hasOpenRouter,
  onRetry,
  onDemo,
}: {
  missing: string[]
  hasOpenRouter: boolean
  onRetry: () => void
  onDemo: () => void
}) {
  useKeyboard((key) => {
    if (key.name === "r") {
      onRetry()
    } else if (key.name === "d") {
      onDemo()
    }
  })

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
      <ascii-font text="SETUP" font="tiny" color={theme.accent} />
      <text fg={theme.textDim}>Upstash credentials not found</text>

      <box
        title="Connect your Upstash account"
        titleColor={theme.title}
        style={{
          border: true,
          borderStyle: "rounded",
          borderColor: theme.border,
          backgroundColor: theme.bgPanel,
          width: 62,
          flexDirection: "column",
          padding: 1,
          gap: 1,
          marginTop: 1,
        }}
      >
        <text fg={theme.textDim}>
          Add these to a <span fg={theme.textBright}>.env</span> file in the project root, then
          restart or press <span fg={theme.accent}>r</span> to retry.
        </text>

        <box style={{ flexDirection: "column" }}>
          {REQUIRED_VARS.map((name) => {
            const isMissing = missing.includes(name)
            return (
              <text key={name} fg={isMissing ? theme.warn : theme.accent}>
                {isMissing ? "• " : "✓ "}
                {name}
              </text>
            )
          })}
          <text fg={theme.textFaint} attributes={TextAttributes.DIM}>
            {hasOpenRouter ? "✓ " : "• "}
            OPENROUTER_API_KEY — optional, enables the AI command bar
          </text>
        </box>

        <text fg={theme.textFaint} attributes={TextAttributes.DIM}>
          Get an API key at https://console.upstash.com (Account → Developer API)
        </text>
      </box>

      <box style={{ flexDirection: "row", gap: 2, marginTop: 1 }}>
        <text fg={theme.textDim}>
          <span fg={theme.accent}>[r]</span> retry
        </text>
        <text fg={theme.textDim}>
          <span fg={theme.accent}>[d]</span> continue in demo mode
        </text>
      </box>
    </box>
  )
}
