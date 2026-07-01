import { Audio } from "@opentui/core"

// Tiny UI sound layer for the operation lifecycle. Tones are synthesized in
// code (no asset files) and the whole thing is a no-op unless UPSTASH_TUI_SOUND
// is set to a truthy value AND a real output device is available — so it never
// surprises anyone, breaks CI, or throws in headless runs.

type Wave = "sine" | "triangle"
type Note = { freq: number; ms: number; gain?: number; type?: Wave }
type ToneName = "pop" | "send" | "success" | "error" | "delete"

const SAMPLE_RATE = 44100
const MASTER_VOLUME = 0.35

// Soft plucks (fast attack, exponential decay) rather than raw beeps. Sequences
// of notes read as short chimes; each note re-plucks from its own envelope.
const TONES: Record<ToneName, Note[]> = {
  // Quick high blip — the modal "pop".
  pop: [{ freq: 1100, ms: 30, gain: 0.5 }],
  // Single mid tick — "operation sent".
  send: [{ freq: 660, ms: 70, gain: 0.7 }],
  // Rising two-note — "done".
  success: [
    { freq: 523.25, ms: 90, gain: 0.7 },
    { freq: 783.99, ms: 160, gain: 0.7 },
  ],
  // Descending two-note, duller triangle wave — "failed" without being harsh.
  error: [
    { freq: 440.0, ms: 90, gain: 0.7, type: "triangle" },
    { freq: 329.63, ms: 180, gain: 0.7, type: "triangle" },
  ],
  // Low weighty thunk — makes destructive confirms feel heavier.
  delete: [{ freq: 174.61, ms: 220, gain: 0.9 }],
}

function renderSamples(notes: Note[]): Float32Array {
  const total = notes.reduce((n, note) => n + Math.round((note.ms / 1000) * SAMPLE_RATE), 0)
  const out = new Float32Array(total)
  const attackLen = Math.round(0.005 * SAMPLE_RATE) // 5ms linear attack
  let offset = 0
  for (const note of notes) {
    const len = Math.round((note.ms / 1000) * SAMPLE_RATE)
    const gain = note.gain ?? 1
    const tau = note.ms / 1000 / 3 // decay time constant
    for (let i = 0; i < len; i++) {
      const t = i / SAMPLE_RATE
      const phase = 2 * Math.PI * note.freq * t
      const wave = note.type === "triangle" ? (2 / Math.PI) * Math.asin(Math.sin(phase)) : Math.sin(phase)
      const attack = i < attackLen ? i / attackLen : 1
      out[offset + i] = wave * attack * Math.exp(-t / tau) * gain
    }
    offset += len
  }
  return out
}

// Wrap PCM samples in a minimal 16-bit mono WAV container for loadSound().
function toWav(samples: Float32Array): Uint8Array {
  const dataSize = samples.length * 2
  const buffer = new ArrayBuffer(44 + dataSize)
  const view = new DataView(buffer)
  const writeStr = (o: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(o + i, s.charCodeAt(i))
  }
  writeStr(0, "RIFF")
  view.setUint32(4, 36 + dataSize, true)
  writeStr(8, "WAVE")
  writeStr(12, "fmt ")
  view.setUint32(16, 16, true) // fmt chunk size
  view.setUint16(20, 1, true) // PCM
  view.setUint16(22, 1, true) // mono
  view.setUint32(24, SAMPLE_RATE, true)
  view.setUint32(28, SAMPLE_RATE * 2, true) // byte rate
  view.setUint16(32, 2, true) // block align
  view.setUint16(34, 16, true) // bits per sample
  writeStr(36, "data")
  view.setUint32(40, dataSize, true)
  let o = 44
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]))
    view.setInt16(o, s < 0 ? s * 0x8000 : s * 0x7fff, true)
    o += 2
  }
  return new Uint8Array(buffer)
}

function isEnabled(): boolean {
  const v = (process.env.UPSTASH_TUI_SOUND ?? "").trim().toLowerCase()
  return v === "1" || v === "true" || v === "on" || v === "yes"
}

let engine: Audio | null = null
let ready = false
let unavailable = false
const soundIds: Partial<Record<ToneName, number>> = {}

function init(): void {
  if (ready || unavailable) return
  if (!isEnabled()) {
    unavailable = true
    return
  }
  try {
    const audio = Audio.create({ autoStart: false })
    audio.on("error", () => {}) // swallow — sound is best-effort
    if (!audio.start()) {
      audio.dispose()
      unavailable = true
      return
    }
    audio.setMasterVolume(MASTER_VOLUME)
    for (const name of Object.keys(TONES) as ToneName[]) {
      const id = audio.loadSound(toWav(renderSamples(TONES[name])))
      if (id != null) soundIds[name] = id
    }
    engine = audio
    ready = true
  } catch {
    unavailable = true
    engine = null
  }
}

function play(name: ToneName): void {
  init()
  if (!ready || engine == null) return
  const id = soundIds[name]
  if (id != null) engine.play(id, { volume: 1, pan: 0, loop: false })
}

export const sound = {
  pop: () => play("pop"),
  send: () => play("send"),
  success: () => play("success"),
  error: () => play("error"),
  delete: () => play("delete"),
}
