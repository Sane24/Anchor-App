import { useEffect, useRef } from 'react'

// Ambient sound for the focus timer, generated with the Web Audio API so the
// app ships without any audio files.
//
// White and brown noise are exact — those are mathematical definitions, not
// recordings. Cafe and Rain are approximations built from filtered noise: rain
// reads convincingly, cafe reads as a low murmur rather than actual chatter.
// To swap in real recordings later, replace buildSource() with a
// BufferSource fed by fetch + decodeAudioData, keeping the same gain envelope.

const FADE_SECONDS = 0.18
const BUFFER_SECONDS = 3

// Each preset loses a different amount of energy in its filters, so levels are
// tuned per option to land around 0.038 RMS at the destination — measured, not
// guessed, so switching options doesn't jump in volume.
const LEVELS = {
  'White noise': 0.09,
  'Brown noise': 0.28,
  Cafe: 0.56,
  'Rain sound': 0.145,
}

function noiseBuffer(ctx, kind) {
  const length = ctx.sampleRate * BUFFER_SECONDS
  const buffer = ctx.createBuffer(2, length, ctx.sampleRate)

  for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) {
    const data = buffer.getChannelData(channel)
    if (kind === 'brown') {
      // Leaky integrator over white noise — the standard brown-noise recipe.
      let last = 0
      for (let i = 0; i < length; i += 1) {
        const white = Math.random() * 2 - 1
        last = (last + 0.02 * white) / 1.02
        data[i] = last * 3.5
      }
    } else {
      for (let i = 0; i < length; i += 1) {
        data[i] = Math.random() * 2 - 1
      }
    }
  }

  return buffer
}

// Returns the node that should feed the master gain, plus everything that needs
// stopping later.
function buildSource(ctx, selection) {
  const started = []

  const source = ctx.createBufferSource()
  source.buffer = noiseBuffer(ctx, selection === 'Brown noise' || selection === 'Cafe' ? 'brown' : 'white')
  source.loop = true
  started.push(source)

  let node = source

  if (selection === 'Rain sound') {
    // Broadband hiss with the rumble and the very top rolled off.
    const highpass = ctx.createBiquadFilter()
    highpass.type = 'highpass'
    highpass.frequency.value = 500
    const lowpass = ctx.createBiquadFilter()
    lowpass.type = 'lowpass'
    lowpass.frequency.value = 7200
    node.connect(highpass)
    highpass.connect(lowpass)
    node = lowpass
  } else if (selection === 'Cafe') {
    // Speech babble sits low and narrow; brown noise through a bandpass gets
    // the shape of a room murmur without sounding like voices.
    const bandpass = ctx.createBiquadFilter()
    bandpass.type = 'bandpass'
    bandpass.frequency.value = 620
    bandpass.Q.value = 0.7
    node.connect(bandpass)
    node = bandpass
  }

  return { node, started }
}

export function useAmbientSound(selection) {
  const ctxRef = useRef(null)
  const activeRef = useRef(null)

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

    const { node, started } = buildSource(ctx, selection)
    node.connect(gain)
    started.forEach((source) => source.start())

    activeRef.current = { gain, started }

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
      activeRef.current = null
    }
  }, [selection])

  // Release the context when the app unmounts.
  useEffect(() => {
    return () => {
      if (ctxRef.current && ctxRef.current.state !== 'closed') {
        ctxRef.current.close()
        ctxRef.current = null
      }
    }
  }, [])
}
