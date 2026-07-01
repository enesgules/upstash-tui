import { theme } from "../../theme.ts"

export function CommandBar() {
  return (
    <box
      title="Ask Upstash"
      titleColor={theme.accent}
      style={{
        border: true,
        borderStyle: "rounded",
        borderColor: theme.accent,
        backgroundColor: theme.bgPanel,
        paddingLeft: 1,
        paddingRight: 1,
        height: 3,
      }}
    >
      <input
        placeholder="create a redis db for a nextjs rate limiter"
        focused={false}
        textColor={theme.textBright}
        backgroundColor={theme.bgPanel}
      />
    </box>
  )
}
