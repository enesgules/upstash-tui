import { productColors } from "./theme.ts"

export type ProductKey = "redis" | "qstash" | "workflow" | "vector" | "box"

export type Product = {
  key: ProductKey
  name: string
  color: string
  /** Terminal-safe echo of the brand mark (upstash.com/brand). Text-presentation
      glyphs so they inherit the product color via `fg` rather than emoji tint. */
  glyph: string
  tagline: string
  enabled: boolean
}

export const products: Product[] = [
  {
    key: "redis",
    name: "Redis",
    color: productColors.redis,
    glyph: "⠿",
    tagline: "Serverless key-value store",
    enabled: true,
  },
  {
    key: "qstash",
    name: "QStash",
    color: productColors.qstash,
    glyph: "✳",
    tagline: "Messaging & scheduling",
    enabled: true,
  },
  {
    key: "workflow",
    name: "Workflow",
    color: productColors.workflow,
    glyph: "↯",
    tagline: "Durable serverless functions",
    enabled: true,
  },
  {
    key: "vector",
    name: "Vector",
    color: productColors.vector,
    glyph: "⇗",
    tagline: "Serverless vector database",
    enabled: true,
  },
  {
    key: "box",
    name: "Box",
    color: productColors.box,
    glyph: "⬡",
    tagline: "Instant dev sandboxes",
    enabled: false,
  },
]

export function getProduct(key: ProductKey): Product {
  const product = products.find((p) => p.key === key)
  if (!product) throw new Error(`Unknown product: ${key}`)
  return product
}
