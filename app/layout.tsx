import type { Metadata, Viewport } from 'next';
import AnalyticsConsent from '@/components/AnalyticsConsent';

import './globals.css';
import '@/styles/index.scss';

const SITE = 'https://knox1999.github.io/n5-japanese-studio/';

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: {
    default: 'The Nihongo Vibes — N5 Japanese Learning Studio',
    template: '%s · The Nihongo Vibes',
  },
  description:
    'A focused Japanese-learning studio for JLPT N5 vocabulary, smart recall, listening, shadowing, reading, conversation, grammar, Kanji and mock practice.',
  applicationName: 'The Nihongo Vibes',
  category: 'education',
  keywords: [
    'JLPT N5',
    'Japanese learning',
    'Japanese vocabulary',
    'Japanese listening',
    'Japanese grammar',
    'Kanji',
    'Bangla Japanese learning',
  ],
  alternates: { canonical: SITE },
  manifest: './manifest.webmanifest',
  robots: { index: true, follow: true },
  icons: {
    icon: './assets/nihongo-vibes-logo-192.png',
    apple: './assets/nihongo-vibes-logo-192.png',
  },
  openGraph: {
    type: 'website',
    url: SITE,
    siteName: 'The Nihongo Vibes',
    title: 'The Nihongo Vibes — N5 Japanese Learning Studio',
    description:
      'Vocabulary, listening, shadowing, reading, conversation, grammar, Kanji and smart recall in one connected Japanese learning system.',
    images: [{
      url: './assets/nihongo-vibes-logo-512.png',
      width: 512,
      height: 512,
      alt: 'The Nihongo Vibes',
    }],
  },
  twitter: {
    card: 'summary',
    title: 'The Nihongo Vibes — N5 Japanese Learning Studio',
    description: 'A connected premium Japanese N5 learning workspace.',
    images: ['./assets/nihongo-vibes-logo-512.png'],
  },
  appleWebApp: {
    capable: true,
    title: 'Nihongo Vibes',
    statusBarStyle: 'black-translucent',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#06172d',
  colorScheme: 'dark',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const ga = process.env.NEXT_PUBLIC_GA_ID || 'G-FG3JCWGSPR';
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'EducationalApplication',
    name: 'The Nihongo Vibes',
    url: SITE,
    applicationCategory: 'EducationalApplication',
    operatingSystem: 'Web',
    educationalLevel: 'JLPT N5',
    inLanguage: ['bn', 'ja', 'en'],
    isAccessibleForFree: true,
    description:
      'A Japanese N5 learning application for vocabulary, recall, listening, shadowing, reading, conversation, grammar, Kanji and mock practice.',
  };
  const schemaJson = JSON.stringify(schema).replace(/</g, '\\u003c');

  return (
    <html lang="bn">
      <body>
        <a className="skip-link" href="#main-content">মূল কনটেন্টে যান</a>
        {children}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: schemaJson }}
        />
        <AnalyticsConsent gaId={ga}/>
      </body>
    </html>
  );
}
