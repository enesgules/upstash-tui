# upstash-tui — talktui deck

Internal demo deck for `upstash-tui`, authored for
[talktui](https://github.com/nexxeln/talktui). One Markdown file
(`upstash-tui.md`); the theme is chosen at runtime.

## Run it

talktui is a separate repo — clone it once:

```bash
git clone https://github.com/nexxeln/talktui
cd talktui && bun install
```

Then present this deck (use the absolute path to `upstash-tui.md`):

```bash
bun run deck /Users/abdullahenesgules/Upstash/project-x/upstash-tui/presentation/upstash-tui.md --theme tokyonight
```

## Compare themes

The deck is theme-agnostic — re-run with a different `--theme` to pick:

```bash
bun run deck …/presentation/upstash-tui.md --theme tokyonight
bun run deck …/presentation/upstash-tui.md --theme ember
bun run deck …/presentation/upstash-tui.md --theme catppuccin
```

## Navigate

`n` / `space` / `→` next · `p` / `←` back · `f` first · `l` last ·
`?` help · `q` quit.

## Design

See `../docs/superpowers/specs/2026-07-01-upstash-tui-talktui-deck-design.md`.
