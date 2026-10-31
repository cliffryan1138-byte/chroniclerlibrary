import { useState, type FormEvent } from 'react'
import { appConfig, copy } from '../../config/captains-cellar'
import { store } from '../data'
import { meetsMinimumAge } from '../lib'
import { useApp } from '../state'
import { Button, Card } from '../components/ui'

export function Auth() {
  const { setUser } = useApp()
  const demo = store.kind === 'local'
  const [mode, setMode] = useState<'signup' | 'signin'>('signup')
  const [birthYear, setBirthYear] = useState('')
  const [attest, setAttest] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const year = Number(birthYear)
  const tooYoung = birthYear.length === 4 && !meetsMinimumAge(year, appConfig.minimumAge)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      if (mode === 'signin') return setUser(await store.signIn(email, password))
      if (!meetsMinimumAge(year, appConfig.minimumAge) || !attest) return setError(copy.ageGate.tooYoung)
      const result = await store.signUp(email, password, year)
      if (result === 'check-email') setNotice('Check your email to confirm, then sign in.')
      else setUser(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  const canSubmit = mode === 'signin'
    ? email && password
    : birthYear.length === 4 && !tooYoung && attest && (demo || (email && password.length >= 8))

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 px-4 py-10">
      <header className="text-center">
        <p className="text-xs uppercase tracking-[0.2em] text-accent">{copy.eyebrow}</p>
        <h1 className="font-display text-4xl font-bold leading-tight">{appConfig.name}</h1>
        <p className="mt-2 text-muted">{copy.tagline}</p>
      </header>

      <Card>
        <form onSubmit={submit} className="space-y-4">
          {mode === 'signup' && (
            <>
              <div>
                <h2 className="font-display text-xl font-semibold">{copy.ageGate.title}</h2>
                <p className="text-sm text-muted">{copy.ageGate.body}</p>
              </div>
              <label className="block">
                <span className="mb-1 block text-sm font-semibold">Year you were born</span>
                <input inputMode="numeric" pattern="[0-9]{4}" maxLength={4} placeholder="YYYY" value={birthYear}
                  onChange={(e) => setBirthYear(e.target.value.replace(/\D/g, ''))}
                  className="w-full rounded-md border border-line bg-bg p-3" aria-invalid={tooYoung} />
              </label>
              {tooYoung && <p role="alert" className="text-sm text-danger">{copy.ageGate.tooYoung}</p>}
              <label className="flex items-start gap-3 text-sm">
                <input type="checkbox" checked={attest} onChange={(e) => setAttest(e.target.checked)} className="mt-1 h-5 w-5 accent-[rgb(var(--accent))]" />
                <span>{copy.ageGate.attest}</span>
              </label>
            </>
          )}

          {(!demo || mode === 'signin') && (
            <>
              <label className="block">
                <span className="mb-1 block text-sm font-semibold">Email</span>
                <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-md border border-line bg-bg p-3" />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-semibold">Password</span>
                <input type="password" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} value={password}
                  onChange={(e) => setPassword(e.target.value)} className="w-full rounded-md border border-line bg-bg p-3" />
                {mode === 'signup' && <span className="mt-1 block text-xs text-muted">At least 8 characters.</span>}
              </label>
            </>
          )}

          {error && <p role="alert" className="text-sm text-danger">{error}</p>}
          {notice && <p className="text-sm text-accent">{notice}</p>}
          <Button type="submit" className="w-full" disabled={!canSubmit || busy}>
            {mode === 'signup' ? (demo ? 'Enter the cellar' : 'Create account') : 'Sign in'}
          </Button>
          {!demo && (
            <button type="button" className="w-full text-sm text-muted underline" onClick={() => { setMode(mode === 'signup' ? 'signin' : 'signup'); setError(null) }}>
              {mode === 'signup' ? 'Already have an account? Sign in' : 'New here? Create an account'}
            </button>
          )}
        </form>
      </Card>

      {demo && <p className="text-center text-xs text-muted">{copy.demoBanner}</p>}
      <p className="text-center text-xs text-muted">{copy.compliance}</p>
    </main>
  )
}
