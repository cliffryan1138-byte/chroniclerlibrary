import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { fonts, palette } from '../config/captains-cellar'

export type ThemeSetting = 'system' | 'light' | 'dark'
const KEY = 'ccc:theme'

function resolve(setting: ThemeSetting): 'light' | 'dark' {
  if (setting !== 'system') return setting
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function applyTheme(setting: ThemeSetting) {
  const mode = resolve(setting)
  const root = document.documentElement
  for (const [k, v] of Object.entries(palette[mode])) root.style.setProperty(`--${k}`, v)
  root.style.setProperty('--font-display', fonts.display)
  root.style.setProperty('--font-body', fonts.body)
  root.dataset.theme = mode
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', `rgb(${palette[mode].bg.replace(/ /g, ',')})`)
}

export function initialTheme(): ThemeSetting {
  try { return (localStorage.getItem(KEY) as ThemeSetting) || 'system' } catch { return 'system' }
}

const Ctx = createContext<{ theme: ThemeSetting; setTheme: (t: ThemeSetting) => void }>({ theme: 'system', setTheme: () => {} })

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeSetting>(initialTheme)
  useEffect(() => {
    applyTheme(theme)
    if (theme !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => applyTheme('system')
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [theme])
  const setTheme = (t: ThemeSetting) => {
    setThemeState(t)
    try { localStorage.setItem(KEY, t) } catch { /* ignore */ }
  }
  return <Ctx.Provider value={{ theme, setTheme }}>{children}</Ctx.Provider>
}

export const useTheme = () => useContext(Ctx)
