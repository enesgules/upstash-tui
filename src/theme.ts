export const theme = {
  bg: "#0A0A0A",
  bgPanel: "#111111",
  accent: "#00E9A3",
  accentDim: "#0C3B2E",
  border: "#2A2A2A",
  borderSubtle: "#1E1E1E",
  title: "#E4E4E7",
  textBright: "#F4F4F5",
  textDim: "#A1A1AA",
  textFaint: "#71717A",
  danger: "#F87171",
  warn: "#FBBF24",
} as const

// Per-product accent colors, built around the Upstash emerald.
export const productColors = {
  redis: "#00E9A3",
  qstash: "#8B5CF6",
  workflow: "#3B82F6",
  vector: "#F97316",
  box: "#EC4899",
} as const

export const layout = {
  listWidth: 34,
  gap: 1,
  pad: 1,
} as const
