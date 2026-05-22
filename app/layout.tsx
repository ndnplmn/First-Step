import type { Metadata, Viewport } from 'next'
import { Instrument_Serif, Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google'
import { LanguageProvider } from '@/contexts/language-context'
import './globals.css'

const instrumentSerif = Instrument_Serif({
  weight: ['400'],
  style: ['normal', 'italic'],
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
  preload: true,
})

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
  preload: true,
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
  preload: false,
})

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F6F1EC' },
    { media: '(prefers-color-scheme: dark)', color: '#111009' },
  ],
}

export const metadata: Metadata = {
  title: 'Tend',
  description: 'A space to tend to yourself — guided, intimate, yours.',
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.svg',
    apple: '/favicon.svg',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Tend',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" className={`${instrumentSerif.variable} ${plusJakarta.variable} ${jetbrainsMono.variable}`}>
      <body className="bg-[var(--color-base)] min-h-dvh">
        <LanguageProvider>
          {children}
        </LanguageProvider>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').catch(function() {});
                });
              }
            `,
          }}
        />
      </body>

    </html>
  )
}
