import { useRef, useState } from "react"
import { useKeyboard } from "@opentui/react"
import { theme } from "../../theme.ts"

// A small overlay to compose a QStash publish: destination + message body.
// Enter advances destination → body, then submits. Esc cancels.
export function PublishForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (destination: string, body: string) => void
  onCancel: () => void
}) {
  const [field, setField] = useState<"destination" | "body">("destination")
  const destRef = useRef("")
  const bodyRef = useRef("")

  useKeyboard((key) => {
    if (key.name === "escape") onCancel()
  })

  const Field = ({
    label,
    placeholder,
    active,
    onInput,
    onSubmit: onFieldSubmit,
  }: {
    label: string
    placeholder: string
    active: boolean
    onInput: (v: string) => void
    onSubmit: () => void
  }) => (
    <box style={{ flexDirection: "column" }}>
      <text fg={theme.textDim}>{label}</text>
      <box
        style={{
          border: true,
          borderStyle: "single",
          borderColor: active ? theme.accent : theme.border,
          height: 3,
          paddingLeft: 1,
          paddingRight: 1,
        }}
      >
        <input
          placeholder={placeholder}
          focused={active}
          textColor={theme.textBright}
          backgroundColor={theme.bgPanel}
          onInput={onInput}
          onSubmit={onFieldSubmit}
        />
      </box>
    </box>
  )

  return (
    <box
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        width: "100%",
        height: "100%",
        backgroundColor: theme.bg,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <box
        title="Publish a message"
        titleColor={theme.title}
        titleAlignment="center"
        style={{
          border: true,
          borderStyle: "rounded",
          borderColor: theme.accent,
          backgroundColor: theme.bgPanel,
          width: 72,
          flexDirection: "column",
          padding: 1,
          gap: 1,
        }}
      >
        <Field
          label="Destination — URL or URL-group name"
          placeholder="https://example.com/api/hook"
          active={field === "destination"}
          onInput={(v) => {
            destRef.current = v
          }}
          onSubmit={() => setField("body")}
        />
        <Field
          label="Message body"
          placeholder='{"hello":"world"}'
          active={field === "body"}
          onInput={(v) => {
            bodyRef.current = v
          }}
          onSubmit={() => {
            if (destRef.current.trim()) onSubmit(destRef.current.trim(), bodyRef.current)
          }}
        />
        <text fg={theme.textFaint}>Enter advances / submits · Esc cancels</text>
      </box>
    </box>
  )
}
