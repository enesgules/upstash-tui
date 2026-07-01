import { describe, it, expect } from "bun:test";
import type { RedisSecrets } from "./env.ts";
import { generateEnvSnippet } from "./env.ts";

describe("generateEnvSnippet", () => {
  it("should generate correct .env.local snippet with all required keys", () => {
    const secrets: RedisSecrets = {
      endpoint: "amazing-cat-12345.upstash.io",
      port: 6379,
      password: "pw123",
      restToken: "tok_abc",
    };

    const result = generateEnvSnippet("my-db", secrets);

    expect(result).toContain("# Upstash Redis — my-db");
    expect(result).toContain(
      "UPSTASH_REDIS_REST_URL=https://amazing-cat-12345.upstash.io"
    );
    expect(result).toContain("UPSTASH_REDIS_REST_TOKEN=tok_abc");
    expect(result).toContain(
      "REDIS_URL=rediss://default:pw123@amazing-cat-12345.upstash.io:6379"
    );
  });

  it("should end with a trailing newline", () => {
    const secrets: RedisSecrets = {
      endpoint: "amazing-cat-12345.upstash.io",
      port: 6379,
      password: "pw123",
      restToken: "tok_abc",
    };

    const result = generateEnvSnippet("my-db", secrets);

    expect(result.endsWith("\n")).toBe(true);
  });

  it("should have exactly four lines before the final newline", () => {
    const secrets: RedisSecrets = {
      endpoint: "amazing-cat-12345.upstash.io",
      port: 6379,
      password: "pw123",
      restToken: "tok_abc",
    };

    const result = generateEnvSnippet("my-db", secrets);
    const lines = result.trimEnd().split("\n");

    expect(lines.length).toBe(4);
    expect(lines[0]).toBe("# Upstash Redis — my-db");
    expect(lines[1]).toBe(
      "UPSTASH_REDIS_REST_URL=https://amazing-cat-12345.upstash.io"
    );
    expect(lines[2]).toBe("UPSTASH_REDIS_REST_TOKEN=tok_abc");
    expect(lines[3]).toBe(
      "REDIS_URL=rediss://default:pw123@amazing-cat-12345.upstash.io:6379"
    );
  });
});
