import { afterEach, beforeEach, expect, test } from "bun:test"
import { loadConfig } from "./config.ts"

const VARS = ["UPSTASH_EMAIL", "UPSTASH_API_KEY", "OPENROUTER_API_KEY", "OPENROUTER_MODEL"] as const

let saved: Record<string, string | undefined> = {}

beforeEach(() => {
  saved = {}
  for (const key of VARS) {
    saved[key] = process.env[key]
    delete process.env[key]
  }
})

afterEach(() => {
  for (const key of VARS) {
    const value = saved[key]
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
})

test("both upstash vars present -> upstash set", () => {
  process.env.UPSTASH_EMAIL = "dev@example.com"
  process.env.UPSTASH_API_KEY = "secret-key"
  const config = loadConfig()
  expect(config.upstash).toEqual({ email: "dev@example.com", apiKey: "secret-key" })
})

test("missing UPSTASH_API_KEY -> upstash null", () => {
  process.env.UPSTASH_EMAIL = "dev@example.com"
  const config = loadConfig()
  expect(config.upstash).toBeNull()
})

test("missing UPSTASH_EMAIL -> upstash null", () => {
  process.env.UPSTASH_API_KEY = "secret-key"
  const config = loadConfig()
  expect(config.upstash).toBeNull()
})

test("openrouter key present without model -> default model applied", () => {
  process.env.OPENROUTER_API_KEY = "or-key"
  const config = loadConfig()
  expect(config.openrouter).toEqual({ apiKey: "or-key", model: "anthropic/claude-opus-4.8" })
})

test("openrouter key present with model -> model used", () => {
  process.env.OPENROUTER_API_KEY = "or-key"
  process.env.OPENROUTER_MODEL = "openai/gpt-4o"
  const config = loadConfig()
  expect(config.openrouter).toEqual({ apiKey: "or-key", model: "openai/gpt-4o" })
})

test("all absent -> both null", () => {
  const config = loadConfig()
  expect(config.upstash).toBeNull()
  expect(config.openrouter).toBeNull()
})
