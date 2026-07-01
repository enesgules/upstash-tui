import type { OpenRouterCreds } from "../config.ts"

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"

export async function chatJSON(creds: OpenRouterCreds, system: string, user: string): Promise<string> {
  const response = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${creds.apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://github.com/upstash/upstash-tui",
      "X-Title": "upstash-tui",
    },
    body: JSON.stringify({
      model: creds.model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      response_format: { type: "json_object" },
    }),
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`OpenRouter request failed (${response.status}): ${body}`)
  }

  const data = (await response.json()) as { choices: Array<{ message: { content: string } }> }
  return data.choices[0].message.content
}
