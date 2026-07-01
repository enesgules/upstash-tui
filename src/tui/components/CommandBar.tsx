import { useEffect, useRef, useState } from "react"
import { theme } from "../../theme.ts"
import { ThinkingIndicator } from "./ThinkingIndicator.tsx"

// Rotating example prompts — grounded in the operations the planner supports
// (create, budget, eviction, rename, env), so each reads as a real suggestion.
const SUGGESTIONS = [
  "create a redis db for a nextjs rate limiter",
  "add a $50 monthly budget to context7-prod",
  "enable eviction on context7-analytics",
  "create a redis db in eu-west-1 for session storage",
  "rename context7-mcp-sessions to mcp-cache",
]

const ROTATE_MS = 3500

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
  const [suggestionIndex, setSuggestionIndex] = useState(0)
  // Bumping this remounts the input, clearing its text so a follow-up question
  // starts from empty while the bar keeps focus.
  const [inputKey, setInputKey] = useState(0)

  // Cycle suggestions while idle; hold steady once the user focuses the bar.
  useEffect(() => {
    if (focused || disabled || busy) return
    const id = setInterval(() => {
      setSuggestionIndex((i) => (i + 1) % SUGGESTIONS.length)
    }, ROTATE_MS)
    return () => clearInterval(id)
  }, [focused, disabled, busy])

  const hint = disabled
    ? "Set OPENROUTER_API_KEY in .env to enable the AI command bar"
    : focused
      ? "Ask a question or describe an action · Enter to send · Esc to cancel"
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
      <box style={{ height: 1, flexDirection: "row", gap: 1 }}>
        <text fg={focused ? theme.accent : theme.textFaint}>{"›"}</text>
        <box style={{ flexGrow: 1 }}>
          <input
            key={inputKey}
            placeholder={`e.g. ${SUGGESTIONS[suggestionIndex]}`}
            focused={focused && !disabled && !busy}
            textColor={theme.textBright}
            backgroundColor={theme.bgPanel}
            onInput={(value: string) => {
              valueRef.current = value
            }}
            onSubmit={() => {
              const value = valueRef.current
              valueRef.current = ""
              setInputKey((k) => k + 1)
              onSubmit(value)
            }}
          />
        </box>
      </box>
      {busy ? (
        <ThinkingIndicator />
      ) : (
        <text fg={error ? theme.danger : theme.textFaint}>{error ? error : hint}</text>
      )}
    </box>
  )
}
