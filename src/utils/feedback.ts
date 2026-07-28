import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics'

let audioContext: AudioContext | null = null
let ambientNodes: OscillatorNode[] = []
let ambientGain: GainNode | null = null

function getAudioContext() {
  if (!audioContext) audioContext = new AudioContext()
  if (audioContext.state === 'suspended') void audioContext.resume()
  return audioContext
}

function tone(frequency: number, duration: number, volume: number, delay = 0) {
  const context = getAudioContext()
  const oscillator = context.createOscillator()
  const gain = context.createGain()
  const now = context.currentTime + delay
  oscillator.type = 'sine'
  oscillator.frequency.setValueAtTime(frequency, now)
  oscillator.frequency.exponentialRampToValueAtTime(Math.max(60, frequency * 0.76), now + duration)
  gain.gain.setValueAtTime(0.0001, now)
  gain.gain.exponentialRampToValueAtTime(volume, now + 0.012)
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration)
  oscillator.connect(gain).connect(context.destination)
  oscillator.start(now)
  oscillator.stop(now + duration + 0.03)
}

export function playStoneSound(enabled: boolean, color: 'black' | 'white') {
  if (!enabled) return
  tone(color === 'black' ? 168 : 214, 0.12, 0.12)
  tone(color === 'black' ? 94 : 118, 0.08, 0.045, 0.012)
}

export function playVictorySound(enabled: boolean) {
  if (!enabled) return
  ;[392, 494, 587, 784].forEach((frequency, index) => tone(frequency, 0.34, 0.075, index * 0.105))
}

export function playButtonSound(enabled: boolean) {
  if (enabled) tone(330, 0.055, 0.025)
}

export async function hapticImpact(enabled: boolean, strong = false) {
  if (!enabled) return
  try {
    await Haptics.impact({ style: strong ? ImpactStyle.Medium : ImpactStyle.Light })
  } catch {
    navigator.vibrate?.(strong ? 28 : 10)
  }
}

export async function hapticResult(enabled: boolean, won: boolean) {
  if (!enabled) return
  try {
    await Haptics.notification({ type: won ? NotificationType.Success : NotificationType.Warning })
  } catch {
    navigator.vibrate?.(won ? [25, 45, 25] : [45, 30, 45])
  }
}

export function setAmbientMusic(enabled: boolean) {
  if (!enabled) {
    if (ambientGain && audioContext) {
      ambientGain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.45)
      window.setTimeout(() => {
        ambientNodes.forEach((node) => node.stop())
        ambientNodes = []
        ambientGain = null
      }, 520)
    }
    return
  }
  if (ambientNodes.length) return

  const context = getAudioContext()
  ambientGain = context.createGain()
  ambientGain.gain.setValueAtTime(0.0001, context.currentTime)
  ambientGain.gain.exponentialRampToValueAtTime(0.018, context.currentTime + 1.2)
  ambientGain.connect(context.destination)
  ;[110, 164.81, 220].forEach((frequency, index) => {
    const oscillator = context.createOscillator()
    oscillator.type = index === 0 ? 'sine' : 'triangle'
    oscillator.frequency.value = frequency
    oscillator.detune.value = index === 1 ? 3 : -2
    oscillator.connect(ambientGain!)
    oscillator.start()
    ambientNodes.push(oscillator)
  })
}
