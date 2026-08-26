import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import SignOutButton from '@/components/SignOutButton';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect('/login');

  return (
    <div className="min-h-screen">
      <header className="border-b border-black/10 bg-white/60 backdrop-blur dark:border-white/10 dark:bg-black/20">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3 sm:px-6">
          <Link href="/" className="mr-auto flex items-baseline gap-2">
            <span
              className="text-lg leading-none"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Chronicler
            </span>
            <span className="text-xs uppercase tracking-[0.2em] opacity-50">Dashboard</span>
          </Link>

          <nav className="flex items-center gap-4 text-sm">
            <Link href="/" className="hover:underline">
              Overview
            </Link>
            <Link href="/compose" className="hover:underline">
              Compose
            </Link>
            <Link href="/content" className="hover:underline">
              Content
            </Link>
          </nav>

          <div className="flex items-center gap-3 text-sm">
            <span className="opacity-60">{session.name}</span>
            <SignOutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
