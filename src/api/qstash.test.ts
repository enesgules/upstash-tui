import { describe, expect, test } from "bun:test"
import { mapDlqMessage, mapSchedule, mapUrlGroup } from "./qstash.ts"
import type { RawQStashDlqMessage, RawQStashSchedule, RawQStashUrlGroup } from "./qstash.ts"

describe("mapSchedule", () => {
  test("maps a realistic schedule from the docs", () => {
    const raw: RawQStashSchedule = {
      scheduleId: "scd-123",
      cron: "*/30 * * * *",
      destination: "https://my-endpoint.com",
      createdAt: 1735689600000,
      method: "POST",
      isPaused: false,
    }

    expect(mapSchedule(raw)).toEqual({
      id: "scd-123",
      cron: "*/30 * * * *",
      destination: "https://my-endpoint.com",
      paused: false,
      createdAt: 1735689600000,
    })
  })

  test("defaults paused to false and createdAt to null when absent", () => {
    const raw: RawQStashSchedule = {
      scheduleId: "scd-456",
      cron: "0 * * * *",
      destination: "https://another-endpoint.com",
    }

    expect(mapSchedule(raw)).toEqual({
      id: "scd-456",
      cron: "0 * * * *",
      destination: "https://another-endpoint.com",
      paused: false,
      createdAt: null,
    })
  })

  test("maps isPaused true", () => {
    const raw: RawQStashSchedule = {
      scheduleId: "scd-789",
      cron: "0 0 * * *",
      destination: "https://paused-endpoint.com",
      isPaused: true,
    }

    expect(mapSchedule(raw).paused).toBe(true)
  })
})

describe("mapUrlGroup", () => {
  test("maps a url group with two endpoints", () => {
    const raw: RawQStashUrlGroup = {
      name: "my-topic",
      createdAt: 1735689600000,
      updatedAt: 1735776000000,
      endpoints: [
        { name: "endpoint-1", url: "https://endpoint-1.com" },
        { name: "endpoint-2", url: "https://endpoint-2.com" },
      ],
    }

    expect(mapUrlGroup(raw)).toEqual({
      name: "my-topic",
      endpointCount: 2,
      createdAt: 1735689600000,
      updatedAt: 1735776000000,
    })
  })

  test("maps endpointCount to 0 when endpoints is absent", () => {
    const raw: RawQStashUrlGroup = {
      name: "empty-topic",
    }

    expect(mapUrlGroup(raw)).toEqual({
      name: "empty-topic",
      endpointCount: 0,
      createdAt: null,
      updatedAt: null,
    })
  })
})

describe("mapDlqMessage", () => {
  test("maps a realistic dlq message from the docs", () => {
    const raw: RawQStashDlqMessage = {
      messageId: "msg-123",
      url: "https://my-endpoint.com",
      createdAt: 1735689600000,
      topicName: "my-topic",
      scheduleId: "scd-123",
      responseStatus: 500,
    }

    expect(mapDlqMessage(raw)).toEqual({
      id: "msg-123",
      url: "https://my-endpoint.com",
      createdAt: 1735689600000,
      topicName: "my-topic",
      scheduleId: "scd-123",
      responseStatus: 500,
    })
  })

  test("defaults optional fields to null when absent", () => {
    const raw: RawQStashDlqMessage = {
      messageId: "msg-456",
      url: "https://another-endpoint.com",
    }

    expect(mapDlqMessage(raw)).toEqual({
      id: "msg-456",
      url: "https://another-endpoint.com",
      createdAt: null,
      topicName: null,
      scheduleId: null,
      responseStatus: null,
    })
  })
})
