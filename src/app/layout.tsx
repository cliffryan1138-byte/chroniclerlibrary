import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Chronicler Dashboard',
  description: 'Post blogs, videos, and podcast episodes across The Chronicler Library.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
