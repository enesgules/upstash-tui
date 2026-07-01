import { apiRequest, UpstashApiError } from "./http.ts"

const DEFAULT_BASE_URL = "https://qstash.upstash.io/v2"

export type QStashCreds = { token: string; baseUrl?: string }

function auth(creds: QStashCreds): string {
  return `Bearer ${creds.token}`
}

// Management API is global by default; an override (e.g. a regional URL) is
// normalized to include the /v2 path segment.
function base(creds: QStashCreds): string {
  const url = creds.baseUrl?.replace(/\/+$/, "")
  if (!url) return DEFAULT_BASE_URL
  return url.endsWith("/v2") ? url : `${url}/v2`
}

/**
 * QStash list endpoints sometimes return a bare array and sometimes wrap the
 * array in an object (e.g. `{ messages: [...] }` or `{ schedules: [...] }`).
 * Normalize either shape to a plain array.
 */
function normalizeList<T>(raw: T[] | Record<string, unknown>, key: string): T[] {
  if (Array.isArray(raw)) return raw
  const value = raw[key]
  return Array.isArray(value) ? (value as T[]) : []
}

// -- Schedules ----------------------------------------------------------

export type RawQStashSchedule = {
  scheduleId: string
  cron: string
  destination: string
  createdAt?: number
  method?: string
  isPaused?: boolean
  [key: string]: unknown
}

export type QStashSchedule = {
  id: string
  cron: string
  destination: string
  paused: boolean
  createdAt: number | null
}

export function mapSchedule(raw: RawQStashSchedule): QStashSchedule {
  return {
    id: raw.scheduleId,
    cron: raw.cron,
    destination: raw.destination,
    paused: raw.isPaused ?? false,
    createdAt: raw.createdAt ?? null,
  }
}

export async function listSchedules(creds: QStashCreds): Promise<QStashSchedule[]> {
  const raw = await apiRequest<RawQStashSchedule[] | Record<string, unknown>>({
    method: "GET",
    url: `${base(creds)}/schedules`,
    auth: auth(creds),
  })
  return normalizeList<RawQStashSchedule>(raw, "schedules").map(mapSchedule)
}

// -- URL groups (topics) --------------------------------------------------

export type RawQStashUrlGroupEndpoint = {
  name?: string
  url: string
  [key: string]: unknown
}

export type RawQStashUrlGroup = {
  name: string
  createdAt?: number
  updatedAt?: number
  endpoints?: RawQStashUrlGroupEndpoint[]
  [key: string]: unknown
}

export type QStashUrlGroup = {
  name: string
  endpointCount: number
  createdAt: number | null
  updatedAt: number | null
}

export function mapUrlGroup(raw: RawQStashUrlGroup): QStashUrlGroup {
  return {
    name: raw.name,
    endpointCount: raw.endpoints?.length ?? 0,
    createdAt: raw.createdAt ?? null,
    updatedAt: raw.updatedAt ?? null,
  }
}

export async function listUrlGroups(creds: QStashCreds): Promise<QStashUrlGroup[]> {
  const raw = await apiRequest<RawQStashUrlGroup[] | Record<string, unknown>>({
    method: "GET",
    url: `${base(creds)}/topics`,
    auth: auth(creds),
  })
  return normalizeList<RawQStashUrlGroup>(raw, "urlGroups").map(mapUrlGroup)
}

// -- DLQ (dead-letter queue) ----------------------------------------------

export type RawQStashDlqMessage = {
  messageId: string
  url: string
  createdAt?: number
  topicName?: string
  scheduleId?: string
  responseStatus?: number
  [key: string]: unknown
}

export type QStashDlqMessage = {
  id: string
  url: string
  createdAt: number | null
  topicName: string | null
  scheduleId: string | null
  responseStatus: number | null
}

export function mapDlqMessage(raw: RawQStashDlqMessage): QStashDlqMessage {
  return {
    id: raw.messageId,
    url: raw.url,
    createdAt: raw.createdAt ?? null,
    topicName: raw.topicName ?? null,
    scheduleId: raw.scheduleId ?? null,
    responseStatus: raw.responseStatus ?? null,
  }
}

export async function listDlqMessages(creds: QStashCreds): Promise<QStashDlqMessage[]> {
  const raw = await apiRequest<RawQStashDlqMessage[] | Record<string, unknown>>({
    method: "GET",
    url: `${base(creds)}/dlq`,
    auth: auth(creds),
  })
  return normalizeList<RawQStashDlqMessage>(raw, "messages").map(mapDlqMessage)
}

export async function deleteDlqMessage(creds: QStashCreds, dlqId: string): Promise<void> {
  await apiRequest<void>({
    method: "DELETE",
    url: `${base(creds)}/dlq/${dlqId}`,
    auth: auth(creds),
  })
}

// -- Mutations ------------------------------------------------------------

export type PublishMessageInput = {
  destination: string
  body: string
  delaySeconds?: number
  contentType?: string
}

type RawPublishResponse =
  | { messageId: string; [key: string]: unknown }
  | { messageId: string; [key: string]: unknown }[]

/**
 * Publish a message to a URL or URL-group destination.
 *
 * This bypasses `apiRequest` because QStash forwards the request body
 * verbatim to the destination: it must be sent as a raw string with a
 * caller-controlled Content-Type, not JSON-stringified.
 */
export async function publishMessage(
  creds: QStashCreds,
  input: { destination: string; body: string; delaySeconds?: number; contentType?: string },
): Promise<{ messageId: string }> {
  const headers: Record<string, string> = {
    Authorization: auth(creds),
    "Content-Type": input.contentType ?? "text/plain",
  }
  if (input.delaySeconds !== undefined) {
    headers["Upstash-Delay"] = `${input.delaySeconds}s`
  }

  const response = await fetch(`${base(creds)}/publish/${encodeURI(input.destination)}`, {
    method: "POST",
    headers,
    body: input.body,
  })

  const text = await response.text()
  if (!response.ok) {
    throw new UpstashApiError(response.status, text || response.statusText)
  }

  const parsed = (text ? JSON.parse(text) : undefined) as RawPublishResponse
  const first = Array.isArray(parsed) ? parsed[0] : parsed
  if (!first?.messageId) {
    throw new UpstashApiError(response.status, "QStash publish returned no messageId")
  }
  return { messageId: first.messageId }
}

export async function pauseSchedule(creds: QStashCreds, scheduleId: string): Promise<void> {
  await apiRequest<void>({
    method: "POST",
    url: `${base(creds)}/schedules/${scheduleId}/pause`,
    auth: auth(creds),
  })
}

export async function resumeSchedule(creds: QStashCreds, scheduleId: string): Promise<void> {
  await apiRequest<void>({
    method: "POST",
    url: `${base(creds)}/schedules/${scheduleId}/resume`,
    auth: auth(creds),
  })
}

export async function deleteSchedule(creds: QStashCreds, scheduleId: string): Promise<void> {
  await apiRequest<void>({
    method: "DELETE",
    url: `${base(creds)}/schedules/${scheduleId}`,
    auth: auth(creds),
  })
}
