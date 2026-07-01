export class UpstashApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = "UpstashApiError"
    this.status = status
  }
}

export function basicAuthHeader(email: string, apiKey: string): string {
  return `Basic ${Buffer.from(`${email}:${apiKey}`).toString("base64")}`
}

export async function apiRequest<T>(opts: {
  method: string
  url: string
  auth: string
  body?: unknown
}): Promise<T> {
  const headers: Record<string, string> = { Authorization: opts.auth }
  if (opts.body !== undefined) headers["Content-Type"] = "application/json"

  const response = await fetch(opts.url, {
    method: opts.method,
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  })

  const text = await response.text()

  if (!response.ok) {
    throw new UpstashApiError(response.status, text || response.statusText)
  }

  if (!text) return undefined as T
  try {
    return JSON.parse(text) as T
  } catch {
    throw new UpstashApiError(response.status, `Unexpected non-JSON response: ${text.slice(0, 200)}`)
  }
}
