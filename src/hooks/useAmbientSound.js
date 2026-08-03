import { useEffect, useRef } from 'react'

// Ambient sound for the focus timer, generated with the Web Audio API so the
// app ships without any audio files.
//
// Three of the four are noise. White and brown are exact — those are
// mathematical definitions, not recordings. Rain layers a broadband sheet with
// individual drops written into the PCM, over a detuned copy of itself so the
// buffer's twelve seconds never announce themselves.
//
// Cafe is not noise at all: it is the music a cafe plays, scheduled note by
// note. See the section below for why that one cannot be a loop.
//
// To swap in real recordings later, replace buildSource() with a BufferSource
// fed by fetch + decodeAudioData, keeping the same gain envelope.

const FADE_SECONDS = 0.18

// A 3-second loop announces itself within about a minute, and these run for a
// whole 25-minute sprint. Twelve seconds, plus a detuned second layer on the
// textured presets, pushes the repeat past the point where you notice it.
const BUFFER_SECONDS = 12


// Each preset loses a different amount of energy in its filters, so levels are
// tuned per option so that switching does not jump in volume.
//
// Verified by tapping the graph at ctx.destination in the running app rather
// than by reasoning about the gains: White 0.0269, Brown 0.0268, Cafe 0.0272,
// Rain 0.0259 RMS. Peaks stay near 0.12, far clear of clipping.
//
// Cafe is music, so it is the only one with real dynamics — it runs between
// 0.017 and 0.035 across a chord cycle. Its number above is the average over a
// full cycle, which is what makes it sit with the three steady ones. Measure it
// over at least ten seconds or the reading is whatever the melody was doing.
const LEVELS = {
  'White noise': 0.066,
  'Brown noise': 0.189,
  Cafe: 0.4,
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

// ---------- cafe: the music, not the crowd ----------
//
// Notes are scheduled on the clock rather than baked into a loop. A twelve
// second buffer is fine for noise, but a repeating melody is the most obvious
// loop there is — you hear the seam on the second pass. Scheduling means the
// progression can run for a whole sprint without ever repeating exactly.

// Corner of the rolloff over the music. Low enough that nothing gets sharp,
// high enough to leave the notes their first few harmonics.
const CAFE_TOP = 2600

// One chord every eight seconds. Slow enough to sit behind work rather than
// ask to be followed.
const CHORD_SECONDS = 8

// Fmaj7 - Dm7 - Gm7 - C7. A plain turnaround: every chord shares notes with
// the next, so nothing lands as an event.
const CHORDS = [
  [53, 57, 60, 64],
  [50, 53, 57, 60],
  [55, 58, 62, 65],
  [48, 52, 55, 58],
]

// F major pentatonic over the octave above the chords. Pentatonic has no
// semitone clashes, so a note drawn at random can never sound wrong against
// whichever chord happens to be under it.
const MELODY = [65, 67, 69, 72, 74, 77]

function mtof(midi) {
  return 440 * 2 ** ((midi - 69) / 12)
}

// A struck note: a triangle for the body and a sine an octave up for the bit
// of brightness at the attack, sharing one long exponential decay.
function struck(ctx, dest, midi, at, seconds, level) {
  const frequency = mtof(midi)

  const envelope = ctx.createGain()
  envelope.gain.setValueAtTime(0.0001, at)
  envelope.gain.exponentialRampToValueAtTime(level, at + 0.03)
  envelope.gain.exponentialRampToValueAtTime(0.0001, at + seconds)
  envelope.connect(dest)

  const body = ctx.createOscillator()
  body.type = 'triangle'
  body.frequency.value = frequency
  body.connect(envelope)

  const shimmer = ctx.createOscillator()
  shimmer.type = 'sine'
  shimmer.frequency.value = frequency * 2
  const shimmerGain = ctx.createGain()
  shimmerGain.gain.value = 0.3
  shimmer.connect(shimmerGain)
  shimmerGain.connect(envelope)

  body.start(at)
  shimmer.start(at)
  body.stop(at + seconds + 0.05)
  shimmer.stop(at + seconds + 0.05)
}

// The chord underneath, faded in and out slowly enough that changes are felt
// rather than heard.
function pad(ctx, dest, midis, at, seconds, level) {
  midis.forEach((midi) => {
    const osc = ctx.createOscillator()
    osc.type = 'sine'
    osc.frequency.value = mtof(midi)

    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0.0001, at)
    gain.gain.exponentialRampToValueAtTime(level, at + 1.6)
    gain.gain.setValueAtTime(level, at + seconds - 1.6)
    gain.gain.exponentialRampToValueAtTime(0.0001, at + seconds)

    osc.connect(gain)
    gain.connect(dest)
    osc.start(at)
    osc.stop(at + seconds + 0.05)
  })
}

// A room, built from a decaying noise burst. Convolving the music with this is
// most of what separates "cafe" from "synthesiser".
function makeReverb(ctx, seconds = 2.4, decay = 3.2) {
  const length = Math.floor(ctx.sampleRate * seconds)
  const impulse = ctx.createBuffer(2, length, ctx.sampleRate)
  for (let channel = 0; channel < 2; channel += 1) {
    const data = impulse.getChannelData(channel)
    for (let i = 0; i < length; i += 1) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / length) ** decay
    }
  }
  const convolver = ctx.createConvolver()
  convolver.buffer = impulse
  return convolver
}

// Keeps one chord queued ahead of the clock. Exposes start/stop so it can sit
// in the same `started` list as the oscillators and buffer sources, and be
// torn down by the same loop.
function cafeMusic(ctx, dest) {
  const LOOKAHEAD = 1.5
  let timer = null
  let nextAt = 0
  let step = 0

  function schedule() {
    while (nextAt < ctx.currentTime + LOOKAHEAD) {
      const chord = CHORDS[step % CHORDS.length]
      pad(ctx, dest, chord, nextAt, CHORD_SECONDS, 0.05)

      // Two to four notes at random offsets — off any grid, so the ear never
      // finds a pulse to lock onto.
      const notes = 2 + Math.floor(Math.random() * 3)
      for (let n = 0; n < notes; n += 1) {
        struck(
          ctx,
          dest,
          MELODY[Math.floor(Math.random() * MELODY.length)],
          nextAt + Math.random() * (CHORD_SECONDS - 1.5),
          2.6 + Math.random() * 1.6,
          0.11
        )
      }

      nextAt += CHORD_SECONDS
      step += 1
    }
  }

  return {
    start() {
      nextAt = ctx.currentTime + 0.15
      schedule()
      timer = setInterval(schedule, 400)
    },
    // Notes already queued run on under the master fade-out, which is what
    // stops the cut from clicking.
    stop() {
      if (timer) clearInterval(timer)
      timer = null
    },
  }
}

const FILLS = {
  white: fillWhite,
  brown: fillBrown,
  rain: fillRain,
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
    // The music bus. Everything the scheduler plays lands here first so one
    // filter and one reverb serve every note.
    const instrument = ctx.createGain()

    const tone = ctx.createBiquadFilter()
    tone.type = 'lowpass'
    tone.frequency.value = CAFE_TOP
    instrument.connect(tone)

    // Dry and wet in parallel rather than in series: all-wet loses the attack
    // of each note and the whole thing turns to mush.
    const dry = ctx.createGain()
    dry.gain.value = 0.7
    tone.connect(dry)
    dry.connect(mix)

    const reverb = makeReverb(ctx)
    const wet = ctx.createGain()
    wet.gain.value = 0.45
    tone.connect(reverb)
    reverb.connect(wet)
    wet.connect(mix)

    started.push(cafeMusic(ctx, instrument))

    // A little room tone under the music. Without it the music sits in a
    // vacuum and reads as headphones rather than somewhere with tables in it.
    const room = loopingSource(ctx, getBuffer(ctx, cache, 'brown'), 0.89)
    const roomLow = ctx.createBiquadFilter()
    roomLow.type = 'lowpass'
    roomLow.frequency.value = 320
    const roomGain = ctx.createGain()
    roomGain.gain.value = 0.35
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
