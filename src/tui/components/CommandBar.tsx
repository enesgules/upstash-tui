import { useRef } from "react"
import { theme } from "../../theme.ts"

export function CommandBar({
  focused,
  disabled,
  busy,
  error,
  onSubmit,
}: {
  focused: boolean
  disabled: boolean
  busy: boolean
  error?: string | null
  onSubmit: (value: string) => void
}) {
  const valueRef = useRef("")

  const hint = disabled
    ? "Set OPENROUTER_API_KEY in .env to enable the AI command bar"
    : busy
      ? "Thinking…"
      : focused
        ? "Describe an action · Enter to plan · Esc to cancel"
        : "Press / to ask Upstash AI"

  return (
    <box
      title="Ask Upstash"
      titleColor={theme.accent}
      style={{
        border: true,
        borderStyle: "rounded",
        borderColor: focused ? theme.accent : theme.border,
        backgroundColor: theme.bgPanel,
        paddingLeft: 1,
        paddingRight: 1,
        flexDirection: "column",
      }}
    >
      <box style={{ height: 1 }}>
        <input
          placeholder="create a redis db for a nextjs rate limiter"
          focused={focused && !disabled && !busy}
          textColor={theme.textBright}
          backgroundColor={theme.bgPanel}
          onInput={(value: string) => {
            valueRef.current = value
          }}
          onSubmit={() => onSubmit(valueRef.current)}
        />
      </box>
      <text fg={error ? theme.danger : theme.textFaint}>{error ? error : hint}</text>
    </box>
  )
}
