import { TextAttributes } from "@opentui/core"
import { theme, layout } from "../../theme.ts"
import { truncate } from "../../format.ts"
import type { RedisDatabase } from "../../types.ts"
import { Sparkline } from "./Sparkline.tsx"

// Column budget for a row's name. The selection bar, pin star, and sparkline
// blocks are all ambiguous-width glyphs (2 cells each), so the budgets leave
// generous room for them within layout.listWidth to keep names on one line.
const NAME_MAX_WITH_SPARK = 16
const NAME_MAX_PLAIN = 28

export function ResourceList({
  databases,
  selectedId,
  searchValue,
  searchFocused,
  searchResetKey,
  onSearchInput,
  onSearchSubmit,
}: {
  databases: RedisDatabase[]
  selectedId: string
  searchValue: string
  searchFocused: boolean
  searchResetKey: number
  onSearchInput: (value: string) => void
  onSearchSubmit: () => void
}) {
  return (
    <box
      title="Databases"
      titleColor={theme.title}
      style={{
        border: true,
        borderStyle: "rounded",
        borderColor: theme.border,
        backgroundColor: theme.bgPanel,
        width: layout.listWidth,
        flexShrink: 0,
        flexDirection: "column",
        paddingLeft: 1,
        paddingRight: 1,
        paddingTop: 1,
      }}
    >
      <box
        style={{
          border: true,
          borderStyle: "single",
          borderColor: searchFocused ? theme.accent : theme.borderSubtle,
          height: 3,
          marginBottom: 1,
        }}
      >
        <input
          key={searchResetKey}
          placeholder="Search…  (s)"
          focused={searchFocused}
          textColor={theme.textBright}
          backgroundColor={theme.bgPanel}
          onInput={onSearchInput}
          onSubmit={onSearchSubmit}
        />
      </box>

      {searchValue ? (
        <text fg={theme.textFaint}>
          {databases.length} {databases.length === 1 ? "match" : "matches"}
        </text>
      ) : null}

      <box style={{ flexDirection: "column" }}>
        {databases.length === 0 ? (
          <text fg={theme.textFaint}>
            {searchValue ? "No matches" : "No databases"}
          </text>
        ) : (
          databases.map((db) => {
            const selected = db.id === selectedId
            const values = db.stats?.throughput.map((p) => p.y) ?? []
            const hasSpark = values.length > 0
            const nameMax = hasSpark ? NAME_MAX_WITH_SPARK : NAME_MAX_PLAIN
            const rowBg = selected ? theme.accentDim : theme.bgPanel
            return (
              <box
                key={db.id}
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  backgroundColor: rowBg,
                  paddingLeft: 1,
                  paddingRight: 1,
                }}
              >
                <box style={{ flexDirection: "row" }}>
                  {/* The selection bar and pin star are ambiguous-width glyphs
                      (measured as 2 cells). Always render both and only recolor
                      them — hidden ones blend into the row background — so the
                      name's start column never shifts between rows. */}
                  <text fg={selected ? theme.accent : rowBg}>{"▎"}</text>
                  <text fg={db.pinned ? theme.accent : rowBg}>{"★"}</text>
                  <text
                    fg={selected ? theme.textBright : theme.textDim}
                    attributes={selected ? TextAttributes.BOLD : 0}
                  >
                    {" " + truncate(db.name, nameMax)}
                  </text>
                </box>
                {hasSpark ? <Sparkline values={values} width={5} color={theme.textFaint} /> : null}
              </box>
            )
          })
        )}
      </box>
    </box>
  )
}
