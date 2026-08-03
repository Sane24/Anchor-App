import { useEffect, useRef } from 'react'

// Ambient sound for the focus timer, generated with the Web Audio API so the
// app ships without any audio files.
//
// White and brown noise are exact — those are mathematical definitions, not
// recordings. Cafe and Rain are built by layering: a base texture, events
// written straight into the PCM (raindrops, cup clinks), and a slow modulation
// so the bed breathes instead of sitting still.
//
// To swap in real recordings later, replace buildSource() with a BufferSource
// fed by fetch + decodeAudioData, keeping the same gain envelope.

const FADE_SECONDS = 0.18

// A 3-second loop announces itself within about a minute, and these run for a
// whole 25-minute sprint. Twelve seconds, plus a detuned second layer on the
// textured presets, pushes the repeat past the point where you notice it.
const BUFFER_SECONDS = 12

// Control-rate for the babble envelope: it moves at syllable speed (a few Hz),
// so computing it every 64 samples and interpolating is inaudible and saves
// millions of sin() calls when the buffer is generated.
const ENVELOPE_STEP = 64

// Each preset loses a different amount of energy in its filters, so levels are
// tuned per option to land around 0.038 RMS at the destination — measured
// through an OfflineAudioContext, not guessed, so switching options doesn't
// jump in volume.
// Rendered 8s of each preset in an OfflineAudioContext and divided the target
// by the measured RMS. White lands on 0.577 raw, which is 1/sqrt(3) — the exact
// RMS of uniform noise, so the measurement itself checks out. Peaks stay under
// 0.22 at these levels, well clear of clipping.
const LEVELS = {
  'White noise': 0.066,
  'Brown noise': 0.189,
  Cafe: 0.304,
  'Rain sound': 0.151,
}

// ---------- buffer fills ----------

// Every fill below takes (data, sampleRate) so FILLS can call them uniformly.
// Amplitude is a separate helper rather than a second parameter — as one it
// silently received the sample rate and made white noise 44100x too loud.
function whiteInto(data, amplitude) {
  for (let i = 0; i < data.length; i += 1) {
    data[i] = (Math.random() * 2 - 1) * amplitude
  }
}

function fillWhite(data) {
  whiteInto(data, 1)
}

function fillBrown(data) {
  // Leaky integrator over white noise — the standard brown-noise recipe.
  let last = 0
  for (let i = 0; i < data.length; i += 1) {
    const white = Math.random() * 2 - 1
    last = (last + 0.02 * white) / 1.02
    data[i] = last * 3.5
  }
}

// Adds a short exponentially-decaying burst of noise: one raindrop landing.
function addDrop(data, start, sampleRate) {
  const decay = sampleRate * (0.004 + Math.random() * 0.018)
  const amplitude = 0.3 + Math.random() * 0.5
  const length = Math.min(Math.floor(decay * 4), data.length - start)
  for (let i = 0; i < length; i += 1) {
    data[start + i] += (Math.random() * 2 - 1) * amplitude * Math.exp(-i / decay)
  }
}

// Adds a damped sine: a cup meeting a saucer somewhere across the room.
function addClink(data, start, sampleRate) {
  const frequency = 1500 + Math.random() * 2300
  const decay = sampleRate * (0.02 + Math.random() * 0.03)
  const length = Math.min(Math.floor(decay * 5), data.length - start)
  for (let i = 0; i < length; i += 1) {
    data[start + i] +=
      Math.sin((2 * Math.PI * frequency * i) / sampleRate) * 0.16 * Math.exp(-i / decay)
  }
}

// Rain: a broadband sheet with individual drops written into the PCM. Baking
// them in rather than scheduling BufferSources keeps the runtime cost at zero
// and leaves teardown with nothing extra to cancel.
function fillRain(data, sampleRate) {
  whiteInto(data, 0.5)
  const drops = Math.floor((data.length / sampleRate) * 16)
  for (let n = 0; n < drops; n += 1) {
    addDrop(data, Math.floor(Math.random() * data.length), sampleRate)
  }
}

// Cafe: speech-shaped noise under a syllabic envelope. Several envelopes at
// unrelated rates read as separate conversations; one envelope just pulses.
function fillCafe(data, sampleRate) {
  const voices = 5
  const rates = []
  const phases = []
  for (let v = 0; v < voices; v += 1) {
    rates.push(2.5 + Math.random() * 3) // syllables per second
    phases.push(Math.random() * Math.PI * 2)
  }

  let previous = 0
  let next = 0
  for (let i = 0; i < data.length; i += 1) {
    if (i % ENVELOPE_STEP === 0) {
      previous = next
      const t = (i + ENVELOPE_STEP) / sampleRate
      let sum = 0
      for (let v = 0; v < voices; v += 1) {
        // Half-wave rectified: a syllable is on, then it is not.
        sum += Math.max(0, Math.sin(t * rates[v] * 2 * Math.PI + phases[v]))
      }
      next = sum / voices
    }
    const blend = (i % ENVELOPE_STEP) / ENVELOPE_STEP
    const envelope = previous + (next - previous) * blend
    data[i] = (Math.random() * 2 - 1) * (0.25 + 0.75 * envelope) * 0.6
  }

  const clinks = Math.floor(data.length / sampleRate / 4) // roughly one every 4s
  for (let n = 0; n < clinks; n += 1) {
    addClink(data, Math.floor(Math.random() * data.length), sampleRate)
  }
}

const FILLS = {
  white: fillWhite,
  brown: fillBrown,
  rain: fillRain,
  cafe: fillCafe,
}

// Generating a 12-second stereo buffer costs real milliseconds, so each kind is
// built once per audio context and reused when you switch back to it.
function getBuffer(ctx, cache, kind) {
  if (cache[kind]) return cache[kind]

  const length = Math.floor(ctx.sampleRate * BUFFER_SECONDS)
  const buffer = ctx.createBuffer(2, length, ctx.sampleRate)
  // Each channel is filled independently, which is what gives these their
  // stereo width — the two sides are uncorrelated rather than a copy.
  for (let channel = 0; channel < 2; channel += 1) {
    FILLS[kind](buffer.getChannelData(channel), ctx.sampleRate)
  }

  cache[kind] = buffer
  return buffer
}

// ---------- graph ----------

function loopingSource(ctx, buffer, playbackRate = 1) {
  const source = ctx.createBufferSource()
  source.buffer = buffer
  source.loop = true
  source.playbackRate.value = playbackRate
  return source
}

// A slow sine on a gain node: the bed swells and settles instead of sitting at
// one level for twenty-five minutes.
function drift(ctx, target, rate, depth) {
  const lfo = ctx.createOscillator()
  lfo.frequency.value = rate
  const amount = ctx.createGain()
  amount.gain.value = depth
  lfo.connect(amount)
  amount.connect(target)
  return lfo
}

// Returns the node that should feed the master gain, plus everything that needs
// stopping later.
function buildSource(ctx, cache, selection) {
  const started = []
  const mix = ctx.createGain()

  if (selection === 'White noise' || selection === 'Brown noise') {
    const source = loopingSource(ctx, getBuffer(ctx, cache, selection === 'Brown noise' ? 'brown' : 'white'))
    source.connect(mix)
    started.push(source)
    return { node: mix, started }
  }

  if (selection === 'Rain sound') {
    // The sheet: everything above the rumble, with the harshest top rolled off.
    const sheet = loopingSource(ctx, getBuffer(ctx, cache, 'rain'))
    const highpass = ctx.createBiquadFilter()
    highpass.type = 'highpass'
    highpass.frequency.value = 550
    const lowpass = ctx.createBiquadFilter()
    lowpass.type = 'lowpass'
    lowpass.frequency.value = 8800
    const sheetGain = ctx.createGain()
    sheetGain.gain.value = 0.85
    sheet.connect(highpass)
    highpass.connect(lowpass)
    lowpass.connect(sheetGain)
    sheetGain.connect(mix)
    started.push(sheet, drift(ctx, sheetGain.gain, 0.05, 0.12))

    // The rumble underneath. Detuned so it and the sheet drift out of phase
    // instead of repeating together every twelve seconds.
    const body = loopingSource(ctx, getBuffer(ctx, cache, 'brown'), 0.93)
    const bodyLow = ctx.createBiquadFilter()
    bodyLow.type = 'lowpass'
    bodyLow.frequency.value = 380
    const bodyGain = ctx.createGain()
    bodyGain.gain.value = 0.5
    body.connect(bodyLow)
    bodyLow.connect(bodyGain)
    bodyGain.connect(mix)
    started.push(body)

    return { node: mix, started }
  }

  if (selection === 'Cafe') {
    // Babble sits in the speech band. Anything above it starts to sound like
    // words you should be able to make out, which is the distracting part.
    const babble = loopingSource(ctx, getBuffer(ctx, cache, 'cafe'))
    const bandpass = ctx.createBiquadFilter()
    bandpass.type = 'bandpass'
    bandpass.frequency.value = 700
    bandpass.Q.value = 0.6
    const lowpass = ctx.createBiquadFilter()
    lowpass.type = 'lowpass'
    lowpass.frequency.value = 3400
    const babbleGain = ctx.createGain()
    babbleGain.gain.value = 0.9
    babble.connect(bandpass)
    bandpass.connect(lowpass)
    lowpass.connect(babbleGain)
    babbleGain.connect(mix)
    // Moving the band slightly is the difference between a room and a filter.
    started.push(babble, drift(ctx, bandpass.frequency, 0.07, 90))

    const room = loopingSource(ctx, getBuffer(ctx, cache, 'brown'), 0.89)
    const roomLow = ctx.createBiquadFilter()
    roomLow.type = 'lowpass'
    roomLow.frequency.value = 260
    const roomGain = ctx.createGain()
    roomGain.gain.value = 0.6
    room.connect(roomLow)
    roomLow.connect(roomGain)
    roomGain.connect(mix)
    started.push(room)

    return { node: mix, started }
  }

  const source = loopingSource(ctx, getBuffer(ctx, cache, 'white'))
  source.connect(mix)
  started.push(source)
  return { node: mix, started }
}

export function useAmbientSound(selection) {
  const ctxRef = useRef(null)
  const cacheRef = useRef({})

  useEffect(() => {
    if (!selection || selection === 'None') return undefined

    const AudioCtx = window.AudioContext || window.webkitAudioContext
    if (!AudioCtx) return undefined

    if (!ctxRef.current) ctxRef.current = new AudioCtx()
    const ctx = ctxRef.current
    // Selection always follows a click, so this resume is inside a gesture.
    if (ctx.state === 'suspended') ctx.resume()

    const gain = ctx.createGain()
    const level = LEVELS[selection] ?? 0.15
    gain.gain.setValueAtTime(0.0001, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(level, ctx.currentTime + FADE_SECONDS)
    gain.connect(ctx.destination)

    const { node, started } = buildSource(ctx, cacheRef.current, selection)
    node.connect(gain)
    started.forEach((source) => source.start())

    return () => {
      // Ramp down before stopping, otherwise the cut produces a click.
      const stopAt = ctx.currentTime + FADE_SECONDS
      try {
        gain.gain.cancelScheduledValues(ctx.currentTime)
        gain.gain.setValueAtTime(gain.gain.value, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.0001, stopAt)
      } catch {
        // A context torn down mid-ramp is fine to ignore.
      }
      started.forEach((source) => {
        try {
          source.stop(stopAt)
        } catch {
          /* already stopped */
        }
      })
    }
  }, [selection])

  // Release the context when the app unmounts.
  useEffect(() => {
    return () => {
      if (ctxRef.current && ctxRef.current.state !== 'closed') {
        ctxRef.current.close()
        ctxRef.current = null
        cacheRef.current = {}
      }
    }
  }, [])
}
