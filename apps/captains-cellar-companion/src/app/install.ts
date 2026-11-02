import { useEffect, useState } from 'react'

// Android and desktop Chrome offer an install prompt once; it can fire before any screen mounts, so it is
// caught here at startup and kept until Settings asks for it. iPhones have no prompt: people use Share.
interface InstallPrompt extends Event { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> }
let deferred: InstallPrompt | null = null
const listeners = new Set<() => void>()
const notify = () => listeners.forEach((l) => l())

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferred = e as InstallPrompt; notify() })
  window.addEventListener('appinstalled', () => { deferred = null; notify() })
}

export type InstallState = 'installed' | 'prompt' | 'ios' | 'manual'

export function installState(): InstallState {
  const standalone = window.matchMedia?.('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true
  if (standalone) return 'installed'
  if (deferred) return 'prompt'
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  return ios ? 'ios' : 'manual'
}

export function useInstall() {
  const [state, setState] = useState<InstallState>(() => installState())
  useEffect(() => {
    const update = () => setState(installState())
    listeners.add(update)
    return () => { listeners.delete(update) }
  }, [])
  const install = async () => {
    if (!deferred) return
    await deferred.prompt()
    await deferred.userChoice
    deferred = null
    notify()
  }
  return { state, install }
}
