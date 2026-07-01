import { apiRequest } from "./http.ts"

const BASE_URL = "https://qstash.upstash.io/v2"

export type QStashCreds = { token: string }

function auth(creds: QStashCreds): string {
  return `Bearer ${creds.token}`
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
    url: `${BASE_URL}/schedules`,
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
    url: `${BASE_URL}/topics`,
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
    url: `${BASE_URL}/dlq`,
    auth: auth(creds),
  })
  return normalizeList<RawQStashDlqMessage>(raw, "messages").map(mapDlqMessage)
}
