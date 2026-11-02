import { appConfig, copy } from '../../config/captains-cellar'
import { branches } from '../branch'
import { store } from '../data'
import { useApp } from '../state'
import { useTheme, type ThemeSetting } from '../theme'
import { useInstall } from '../install'
import { Button, Card, Section, Segmented } from '../components/ui'

function InstallCard() {
  const { state, install } = useInstall()
  if (state === 'installed') return null
  return (
    <Section title="Add to your Home Screen" hint="It opens full screen like any other app, with its own icon. No app store needed.">
      <Card className="space-y-2 text-sm">
        {state === 'prompt' && <Button className="w-full" onClick={install}>Install the app</Button>}
        {state === 'ios' && (
          <ol className="list-decimal space-y-1 pl-5">
            <li>Open this page in <span className="font-semibold">Safari</span>.</li>
            <li>Tap the <span className="font-semibold">Share</span> button (the square with an arrow).</li>
            <li>Scroll down and tap <span className="font-semibold">Add to Home Screen</span>, then <span className="font-semibold">Add</span>.</li>
          </ol>
        )}
        {state === 'manual' && <p className="text-muted">Open your browser's menu and choose <span className="font-semibold">Install app</span> or <span className="font-semibold">Add to Home screen</span>.</p>}
      </Card>
    </Section>
  )
}

export function Settings({ onRetakeQuiz }: { onRetakeQuiz: () => void }) {
  const { user, updateUser, signOut } = useApp()
  const { theme, setTheme } = useTheme()
  return (
    <div className="space-y-7">
      <h1 className="font-display text-3xl font-bold">Settings</h1>
      <InstallCard />

      <Section title="Logging mode" hint="Simple: tap families and rate. Detailed: specific notes by third, plus draw, burn, and construction. Both feed the same profile.">
        <Segmented label="Logging mode" value={user?.mode ?? 'simple'} onChange={(mode) => updateUser({ mode })}
          options={[{ label: 'Simple', value: 'simple' }, { label: 'Detailed', value: 'detailed' }]} />
      </Section>

      <Section title="Appearance">
        <Segmented<ThemeSetting> label="Theme" value={theme} onChange={setTheme}
          options={[{ label: 'System', value: 'system' }, { label: 'Light', value: 'light' }, { label: 'Dark', value: 'dark' }]} />
      </Section>

      <Section title="Your palate quiz">
        <Button variant="ghost" className="w-full" onClick={onRetakeQuiz}>Retake the quiz</Button>
      </Section>

      {branches.map((b) => (
        <Section key={b.id} title={branches.length > 1 ? `Glossary: ${b.name.toLowerCase()}` : 'Glossary'}>
          <Card className="divide-y divide-line p-0">
            {b.glossary.map((g) => (
              <details key={g.term} className="px-4 py-3">
                <summary className="cursor-pointer font-semibold">{g.term}</summary>
                <p className="mt-1 text-sm text-muted">{g.meaning}</p>
              </details>
            ))}
          </Card>
        </Section>
      ))}

      <Section title="About">
        <Card className="space-y-2 text-sm">
          <p className="font-semibold">{appConfig.name}</p>
          <p className="text-muted">{copy.compliance}</p>
          <p className="text-muted">Your logs are private to you. There is no sharing, no store, and no affiliate links.</p>
          {store.kind === 'local' && <p className="text-accent">{copy.demoBanner}</p>}
        </Card>
      </Section>

      <Button variant="ghost" className="w-full" onClick={signOut}>{store.kind === 'local' ? 'Reset demo data' : 'Sign out'}</Button>
    </div>
  )
}
