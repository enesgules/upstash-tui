// A pure "shimmer" model for animated text: given a string and a frame number,
// it returns each character tinted by a bright band that sweeps left-to-right,
// like Claude Code's thinking indicator. No timers or theme deps live here so
// the math is trivially testable; the component feeds it a frame counter.

export type ShimmerCell = { char: string; color: string; intensity: number }

export type ShimmerOptions = {
  /** Color of the dim, resting characters (hex). */
  base?: string
  /** Color at the crest of the sweeping highlight (hex). */
  highlight?: string
  /** Half-width of the bright band, in characters. */
  width?: number
  /** Characters the crest advances per frame. */
  speed?: number
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "")
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
}

function channel(value: number): string {
  return Math.round(Math.max(0, Math.min(255, value)))
    .toString(16)
    .padStart(2, "0")
}

function mix(base: string, highlight: string, t: number): string {
  const a = hexToRgb(base)
  const b = hexToRgb(highlight)
  return `#${channel(a[0] + (b[0] - a[0]) * t)}${channel(a[1] + (b[1] - a[1]) * t)}${channel(a[2] + (b[2] - a[2]) * t)}`
}

export function shimmerFrame(text: string, frame: number, opts: ShimmerOptions = {}): ShimmerCell[] {
  const { base = "#12A480", highlight = "#CCFBED", width = 3, speed = 0.5 } = opts
  const n = text.length
  if (n === 0) return []

  // The crest travels from just before the first char to just past the last,
  // then wraps — giving a continuous repeating sweep.
  const span = n + width * 2
  const crest = ((frame * speed) % span) - width

  const cells: ShimmerCell[] = []
  for (let i = 0; i < n; i++) {
    const distance = Math.abs(i - crest)
    const intensity = Math.max(0, 1 - distance / width)
    cells.push({ char: text[i]!, color: mix(base, highlight, intensity), intensity })
  }
  return cells
}
