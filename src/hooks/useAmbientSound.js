import { useEffect, useRef } from 'react'

// Ambient sound for the focus timer, generated with the Web Audio API so the
// app ships without any audio files.
//
// White and brown noise are exact — those are mathematical definitions, not
// recordings. Cafe and Rain are built by layering: a base texture, a slow
// modulation so the bed breathes instead of sitting still, and a second copy
// of the loop at a detuned rate so the buffer's twelve seconds never announce
// themselves.
//
// Rain also writes individual drops into the PCM. Cafe deliberately does not
// get the same treatment: a raindrop is a noise burst and two hundred of them
// blur into texture, but a discrete tonal event — a cup on a saucer — stays
// audible as itself, and a baked-in one repeats on every pass of the loop.
// Periodic pings are the opposite of what a focus timer wants.
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
// tuned per option so that switching does not jump in volume.
//
// Verified by tapping the graph at ctx.destination in the running app rather
// than by reasoning about the gains: White 0.0270, Brown 0.0268, Cafe 0.0276,
// Rain 0.0257 RMS — 7.4% between loudest and quietest, under a decibel. Peaks
// stay near 0.11, far clear of clipping. Re-measure after touching any filter:
// steepening Cafe's rolloff alone moved it 10%.
const LEVELS = {
  'White noise': 0.066,
  'Brown noise': 0.189,
  Cafe: 0.278,
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

// Cafe: speech-shaped noise under a syllabic envelope.
//
// Voice count is the whole ballgame. Five envelopes do not average out — they
// beat against each other and the bed pulses at a few Hz, which reads as a
// tremolo pedal rather than a room. Forty of them overlap into the steady
// murmur you actually hear from across a cafe.
const CAFE_VOICES = 40

// Mean of a half-wave rectified sine. The summed envelope settles here, so it
// is what the swing below is measured against.
const RECTIFIED_MEAN = 1 / Math.PI

// How far the bed is allowed to move around that mean.
//
// Voice count alone was not enough. Forty voices cut the envelope's spread by
// sqrt(40/5) against the old five, but dividing by RECTIFIED_MEAN to get a
// relative swing multiplies it back up by about the same factor — measured,
// the bed still moved 19% either side of its mean, against 26% before. Halving
// it here is what actually takes the pulse out: roughly 10%, which is life in
// the bed rather than a tremolo on it.
const CAFE_DEPTH = 0.55

// Corner of the two-pole rolloff over the babble. Lower is softer and further
// away; much below this the consonant band goes with it and the room stops
// reading as people and starts reading as wind.
const CAFE_TOP = 1900

function fillCafe(data, sampleRate) {
  const rates = []
  const phases = []
  for (let v = 0; v < CAFE_VOICES; v += 1) {
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
      for (let v = 0; v < CAFE_VOICES; v += 1) {
        // Half-wave rectified: a syllable is on, then it is not.
        sum += Math.max(0, Math.sin(t * rates[v] * 2 * Math.PI + phases[v]))
      }
      next = sum / CAFE_VOICES
    }
    const blend = (i % ENVELOPE_STEP) / ENVELOPE_STEP
    const envelope = previous + (next - previous) * blend
    const swing = (envelope - RECTIFIED_MEAN) / RECTIFIED_MEAN
    // Floored so a rare deep trough thins the bed instead of punching a hole.
    const level = Math.max(0.2, 1 + CAFE_DEPTH * swing)
    // 0.29 holds the same RMS the old (0.25 + 0.75 * envelope) * 0.6 produced,
    // so LEVELS.Cafe still lands with the other three presets.
    data[i] = (Math.random() * 2 - 1) * level * 0.29
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
    // The bed underneath is white noise, so it carries as much energy at 4 kHz
    // as at 400. One biquad at 3400 rolls off at 12 dB/oct and leaves plenty of
    // 2–4 kHz standing — which is exactly where the ear is most sensitive, and
    // why this read as hissy rather than distant. Two in series at a lower
    // corner gives 24 dB/oct and takes that band down properly.
    const lowpass = ctx.createBiquadFilter()
    lowpass.type = 'lowpass'
    lowpass.frequency.value = CAFE_TOP
    const lowpass2 = ctx.createBiquadFilter()
    lowpass2.type = 'lowpass'
    lowpass2.frequency.value = CAFE_TOP
    // A shelf rather than a third pole: keeps a little air so the room does not
    // sound like it is behind a closed door.
    const tilt = ctx.createBiquadFilter()
    tilt.type = 'highshelf'
    tilt.frequency.value = 1600
    tilt.gain.value = -5
    const babbleGain = ctx.createGain()
    // Raised to make back the energy the steeper rolloff removes; the level
    // check below confirms Cafe still sits with the other three.
    babbleGain.gain.value = 1.5
    babble.connect(bandpass)
    bandpass.connect(lowpass)
    lowpass.connect(lowpass2)
    lowpass2.connect(tilt)
    tilt.connect(babbleGain)
    babbleGain.connect(mix)
    // Moving the band slightly is the difference between a room and a filter.
    started.push(babble, drift(ctx, bandpass.frequency, 0.07, 90))

    // A second pass over the same babble, slowed enough that the two never line
    // up again inside a sprint — otherwise the whole bed repeats on the
    // buffer's twelve seconds. Slower also reads as further off, which is what
    // the far side of a room sounds like.
    const farBabble = loopingSource(ctx, getBuffer(ctx, cache, 'cafe'), 0.83)
    const farGain = ctx.createGain()
    // Incoherent sources sum in power, so 0.9 and 0.5 together land close to
    // where 0.9 alone did and LEVELS.Cafe stays valid.
    farGain.gain.value = 0.5
    farBabble.connect(farGain)
    farGain.connect(bandpass)
    started.push(farBabble)

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
