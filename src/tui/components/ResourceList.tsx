import { TextAttributes } from "@opentui/core"
import { theme, layout } from "../../theme.ts"
import { truncate } from "../../format.ts"
import type { RedisDatabase } from "../../types.ts"
import { Sparkline } from "./Sparkline.tsx"

// Column budget for a row's name, derived from the list width. Leaves room for
// the pin marker and (when present) the inline sparkline so names never wrap.
const NAME_MAX_WITH_SPARK = 18
const NAME_MAX_PLAIN = 26

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
            return (
              <box
                key={db.id}
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  backgroundColor: selected ? theme.accentDim : theme.bgPanel,
                  paddingLeft: 1,
                  paddingRight: 1,
                }}
              >
                <box style={{ flexDirection: "row" }}>
                  <text fg={theme.accent}>{selected ? "▎" : " "}</text>
                  <text fg={db.pinned ? theme.accent : theme.textFaint}>
                    {db.pinned ? "★ " : "  "}
                  </text>
                  <text
                    fg={selected ? theme.textBright : theme.textDim}
                    attributes={selected ? TextAttributes.BOLD : 0}
                  >
                    {truncate(db.name, nameMax)}
                  </text>
                </box>
                {hasSpark ? <Sparkline values={values} width={7} color={theme.textFaint} /> : null}
              </box>
            )
          })
        )}
      </box>
    </box>
  )
}
