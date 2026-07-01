import { productColors } from "./theme.ts"

export type ProductKey = "redis" | "qstash" | "workflow" | "vector" | "box"

export type Product = {
  key: ProductKey
  name: string
  color: string
  tagline: string
  enabled: boolean
}

export const products: Product[] = [
  {
    key: "redis",
    name: "Redis",
    color: productColors.redis,
    tagline: "Serverless key-value store",
    enabled: true,
  },
  {
    key: "qstash",
    name: "QStash",
    color: productColors.qstash,
    tagline: "Messaging & scheduling",
    enabled: true,
  },
  {
    key: "workflow",
    name: "Workflow",
    color: productColors.workflow,
    tagline: "Durable serverless functions",
    enabled: false,
  },
  {
    key: "vector",
    name: "Vector",
    color: productColors.vector,
    tagline: "Serverless vector database",
    enabled: true,
  },
  {
    key: "box",
    name: "Box",
    color: productColors.box,
    tagline: "Instant dev sandboxes",
    enabled: false,
  },
]

export function getProduct(key: ProductKey): Product {
  const product = products.find((p) => p.key === key)
  if (!product) throw new Error(`Unknown product: ${key}`)
  return product
}
