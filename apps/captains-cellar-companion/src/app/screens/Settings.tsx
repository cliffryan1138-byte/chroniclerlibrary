import { appConfig, copy } from '../../config/captains-cellar'
import { branch } from '../branch'
import { store } from '../data'
import { useApp } from '../state'
import { useTheme, type ThemeSetting } from '../theme'
import { Button, Card, Section, Segmented } from '../components/ui'

export function Settings({ onRetakeQuiz }: { onRetakeQuiz: () => void }) {
  const { user, updateUser, signOut } = useApp()
  const { theme, setTheme } = useTheme()
  return (
    <div className="space-y-7">
      <h1 className="font-display text-3xl font-bold">Settings</h1>

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

      <Section title="Glossary">
        <Card className="divide-y divide-line p-0">
          {branch.glossary.map((g) => (
            <details key={g.term} className="px-4 py-3">
              <summary className="cursor-pointer font-semibold">{g.term}</summary>
              <p className="mt-1 text-sm text-muted">{g.meaning}</p>
            </details>
          ))}
        </Card>
      </Section>

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
