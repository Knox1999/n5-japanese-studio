import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import AnalyticsConsent from '@/components/AnalyticsConsent';

import './globals.css';
import '@/styles/premium.scss';
import '@/styles/v46-futuristic.scss';
import '@/styles/v53-visual-grammar.scss';
import '@/styles/v54-clean-verb-lab.scss';
import '@/styles/v57-signature.scss';
import '@/styles/v58-design-system.scss';
import '@/styles/v60-ultimate.scss';
import '@/styles/v62-connected-learning.scss';
import '@/styles/v62-dashboard-context.scss';
import '@/styles/v63-brand-experience.scss';
import '@/styles/v64-learning-labs.scss';
import '@/styles/v65-production-qa.scss';
import '@/styles/v66-shell-correction.scss';
import '@/styles/v67-home-perfect.scss';
import '@/styles/v68-vocabulary-perfect.scss';

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
  keywords: [
    'JLPT N5',
    'Japanese learning',
    'Japanese vocabulary',
    'Japanese listening',
    'Japanese grammar',
    'Kanji',
    'Bangla Japanese learning',
  ],
  alternates: {
    canonical: SITE,
  },
  manifest: './manifest.webmanifest',
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
    images: [
      {
        url: './assets/nihongo-vibes-logo-512.png',
        width: 512,
        height: 512,
        alt: 'The Nihongo Vibes',
      },
    ],
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
  themeColor: '#071421',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
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
    description:
      'A Japanese N5 learning application for vocabulary, recall, listening, shadowing, reading, conversation, grammar, Kanji and mock practice.',
  };

  return (
    <html lang="bn">
      <body>
        <a className="skip-link" href="#main-content">
          মূল কনটেন্টে যান
        </a>

        {children}

        <Script
          id="nihongo-schema"
          type="application/ld+json"
          strategy="afterInteractive"
        >
          {JSON.stringify(schema)}
        </Script>

        <AnalyticsConsent gaId={ga}/>
      </body>
    </html>
  );
}
