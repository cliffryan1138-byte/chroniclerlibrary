import { useState } from 'react'
import { copy } from '../../config/captains-cellar'
import { branch } from '../branch'
import { useApp } from '../state'
import { FamilyPicker } from '../components/FamilyPicker'
import { Button, Section, Segmented } from '../components/ui'

const toggle = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v])

export function Quiz({ onDone }: { onDone?: () => void }) {
  const { user, updateUser } = useApp()
  const [liked, setLiked] = useState<string[]>(user?.quizSeed?.likedFamilies ?? [])
  const [disliked, setDisliked] = useState<string[]>(user?.quizSeed?.dislikedFamilies ?? [])
  const [strength, setStrength] = useState<number | null>(user?.quizSeed?.strength ?? null)
  const [busy, setBusy] = useState(false)

  async function finish() {
    setBusy(true)
    await updateUser({ quizSeed: { likedFamilies: liked, dislikedFamilies: disliked, strength } })
    setBusy(false)
    onDone?.()
  }

  return (
    <main className="mx-auto max-w-md space-y-7 px-4 py-8">
      <header>
        <h1 className="font-display text-3xl font-bold">{copy.quiz.title}</h1>
        <p className="mt-1 text-muted">{copy.quiz.subtitle}</p>
      </header>
      <Section title={copy.quiz.likes}>
        <FamilyPicker selected={liked} onToggle={(f) => { setLiked(toggle(liked, f)); setDisliked(disliked.filter((d) => d !== f)) }} />
      </Section>
      <Section title={copy.quiz.dislikes}>
        <FamilyPicker tone="danger" selected={disliked} disabled={liked} onToggle={(f) => setDisliked(toggle(disliked, f))} />
      </Section>
      <Section title={copy.quiz.strength} hint="Strength is the nicotine punch, not the flavor.">
        <Segmented label="Strength" options={branch.strengthOptions} value={strength} onChange={setStrength} />
      </Section>
      <Button className="w-full" onClick={finish} disabled={busy || (!liked.length && strength == null)}>{copy.quiz.done}</Button>
    </main>
  )
}
