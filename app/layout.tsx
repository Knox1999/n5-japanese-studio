import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'The Nihongo Vibes',
  description: 'A Bangla-first Japanese learning workspace for JLPT study.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="bn">
      <body>{children}</body>
    </html>
  );
}
