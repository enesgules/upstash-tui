import { useEffect, useState } from "react"
import { useKeyboard } from "@opentui/react"
import { TextAttributes } from "@opentui/core"
import { theme } from "../../theme.ts"
import { sound } from "../../sound.ts"
import type { OperationPlan, Risk } from "../../types.ts"

export type ConfirmSpec =
  | { kind: "yesno" }
  | { kind: "phrase"; phrase: string; label: string }

const RISK_COLOR: Record<Risk, string> = {
  safe: theme.accent,
  paid: theme.warn,
  destructive: theme.danger,
}

const RISK_LABEL: Record<Risk, string> = {
  safe: "SAFE",
  paid: "PAID",
  destructive: "DESTRUCTIVE",
}

function describe(op: OperationPlan["operations"][number]): string {
  switch (op.type) {
    case "redis.create":
      return `Create database "${op.name}"${op.region ? ` in ${op.region}` : ""}${op.plan ? ` (${op.plan})` : ""}`
    case "redis.rename":
      return `Rename ${op.databaseId} → "${op.newName}"`
    case "redis.toggleEviction":
      return `${op.enabled ? "Enable" : "Disable"} eviction on ${op.databaseId}`
    case "redis.updateBudget":
      return `Set monthly budget to $${op.budget} on ${op.databaseId}`
    case "redis.delete":
      return `Delete database "${op.name}"`
    case "qstash.publish":
      return `Publish a message to ${op.destination}${op.delaySeconds ? ` (delay ${op.delaySeconds}s)` : ""}`
    case "qstash.pauseSchedule":
      return `Pause schedule ${op.name}`
    case "qstash.resumeSchedule":
      return `Resume schedule ${op.name}`
    case "qstash.deleteSchedule":
      return `Delete schedule ${op.name}`
    case "qstash.deleteDlq":
      return `Delete DLQ message ${op.name}`
  }
}

export function OperationPreview({
  plan,
  confirm,
  busy,
  error,
  result,
  onConfirm,
  onCancel,
}: {
  plan: OperationPlan
  confirm: ConfirmSpec
  busy: boolean
  error?: string | null
  result?: string[] | null
  onConfirm: () => void
  onCancel: () => void
}) {
  const [value, setValue] = useState("")
  const done = !!result || !!error
  const riskColor = RISK_COLOR[plan.risk]

  // Soft "pop" when the preview modal opens.
  useEffect(() => {
    sound.pop()
  }, [])

  // Chime once the operation resolves: rising for success, descending for error.
  useEffect(() => {
    if (result) sound.success()
  }, [result])
  useEffect(() => {
    if (error) sound.error()
  }, [error])

  // Firing the operation: a weightier "thunk" for destructive ops, a tick otherwise.
  const fireConfirm = () => {
    sound[plan.risk === "destructive" ? "delete" : "send"]()
    onConfirm()
  }

  useKeyboard((key) => {
    if (busy) return
    if (done) {
      // Any of Enter/Esc closes the result view.
      if (key.name === "return" || key.name === "escape" || key.name === "enter") onCancel()
      return
    }
    if (key.name === "escape") {
      onCancel()
      return
    }
    if (confirm.kind === "yesno") {
      if (key.name === "y") fireConfirm()
      else if (key.name === "n") onCancel()
    }
  })

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
        title="Operation preview"
        titleColor={theme.title}
        titleAlignment="center"
        style={{
          border: true,
          borderStyle: "rounded",
          borderColor: riskColor,
          backgroundColor: theme.bgPanel,
          width: 68,
          flexDirection: "column",
          padding: 1,
          gap: 1,
        }}
      >
        <box style={{ flexDirection: "row", gap: 2 }}>
          <text fg={riskColor} attributes={TextAttributes.BOLD}>
            {RISK_LABEL[plan.risk]}
          </text>
          <text fg={theme.textBright} attributes={TextAttributes.BOLD}>
            {plan.title}
          </text>
        </box>

        <text fg={theme.textDim}>{plan.summary}</text>

        <box style={{ flexDirection: "column", marginTop: 1 }}>
          {plan.operations.map((op, i) => (
            <text key={i} fg={theme.textBright}>{`• ${describe(op)}`}</text>
          ))}
        </box>

        {busy ? (
          <text fg={theme.warn}>Running…</text>
        ) : done ? (
          <box style={{ flexDirection: "column", marginTop: 1 }}>
            {error ? (
              <text fg={theme.danger}>{error}</text>
            ) : (
              (result ?? []).map((line, i) => (
                <text key={i} fg={theme.accent}>{`✓ ${line}`}</text>
              ))
            )}
            <text fg={theme.textFaint}>Press Enter to close.</text>
          </box>
        ) : (
          <ConfirmPrompt
            confirm={confirm}
            value={value}
            onInput={setValue}
            onSubmit={() => {
              if (confirm.kind === "phrase" && value.trim() === confirm.phrase) fireConfirm()
            }}
          />
        )}
      </box>
    </box>
  )
}

function ConfirmPrompt({
  confirm,
  value,
  onInput,
  onSubmit,
}: {
  confirm: ConfirmSpec
  value: string
  onInput: (v: string) => void
  onSubmit: () => void
}) {
  if (confirm.kind === "yesno") {
    return (
      <box style={{ flexDirection: "row", gap: 2, marginTop: 1 }}>
        <text fg={theme.accent} attributes={TextAttributes.BOLD}>
          Proceed?  y / N
        </text>
        <text fg={theme.textFaint}>Esc cancels</text>
      </box>
    )
  }
  const matched = value.trim() === confirm.phrase
  return (
    <box style={{ flexDirection: "column", gap: 1, marginTop: 1 }}>
      <text fg={theme.textDim}>{confirm.label}</text>
      <box
        style={{
          border: true,
          borderStyle: "single",
          borderColor: matched ? theme.accent : theme.border,
          height: 3,
          paddingLeft: 1,
          paddingRight: 1,
        }}
      >
        <input
          placeholder={confirm.phrase}
          focused
          textColor={theme.textBright}
          backgroundColor={theme.bgPanel}
          onInput={onInput}
          onSubmit={onSubmit}
        />
      </box>
      <text fg={theme.textFaint}>Enter to confirm · Esc to cancel</text>
    </box>
  )
}
