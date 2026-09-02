import type { Metadata, Viewport } from 'next';
import '@fontsource-variable/noto-sans-bengali';
import '@fontsource-variable/noto-sans-jp';
import AnalyticsConsent from '@/components/AnalyticsConsent';

import './globals.css';
import '@/styles/public.scss';

const SITE = 'https://knox1999.github.io/n5-japanese-studio/';

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: {
    default: 'The Nihongo Vibes — N5 Japanese Learning Studio',
    template: '%s · The Nihongo Vibes',
  },
  description:
    'বাংলাভাষীদের জন্য free JLPT N5 vocabulary, listening, grammar, smart recall এবং timed mock practice—Bangla ও English দুই ভাষায়।',
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
  alternates: { canonical: SITE, languages:{'bn-BD':SITE,'en':`${SITE}en/`,'x-default':SITE} },
  referrer:'strict-origin-when-cross-origin',
  manifest: `${SITE}manifest.webmanifest`,
  robots: { index: true, follow: true },
  icons: {
    icon: `${SITE}assets/nihongo-vibes-logo-192.png`,
    apple: `${SITE}assets/nihongo-vibes-logo-192.png`,
  },
  openGraph: {
    type: 'website',
    url: SITE,
    siteName: 'The Nihongo Vibes',
    title: 'The Nihongo Vibes — N5 Japanese Learning Studio',
    description:
      'Vocabulary, listening, shadowing, reading, conversation, grammar, Kanji and smart recall in one connected Japanese learning system.',
    images: [{
      url: `${SITE}opengraph-image.png`,
      width: 1200,
      height: 630,
      alt: 'The Nihongo Vibes — Bangla-first JLPT N5 Learning Studio',
    }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'The Nihongo Vibes — N5 Japanese Learning Studio',
    description: 'A connected premium Japanese N5 learning workspace.',
    images: [`${SITE}opengraph-image.png`],
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
  const csp=[
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV==='development'?" 'unsafe-eval'":''} https://www.googletagmanager.com`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://www.google-analytics.com",
    "font-src 'self' data:",
    "media-src 'self' blob:",
    "connect-src 'self' https://rfrflfaqvzlhuibickvk.supabase.co https://www.google-analytics.com https://region1.google-analytics.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ');

  return (
    <html lang="bn">
      <head>
        <meta httpEquiv="Content-Security-Policy" content={csp}/>
        {/* Inline so the very first paint is navy, not the browser's default
            dark canvas, on slow connections before globals.css finishes loading. */}
        <style dangerouslySetInnerHTML={{__html:'html,body{background:#050812}'}}/>
      </head>
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
