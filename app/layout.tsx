import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Inter, Geist_Mono } from 'next/font/google'
import './globals.css'

const inter = Inter({
  variable: '--font-geist-sans',
  subsets: ['latin'],
  display: 'swap',
})
const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  metadataBase: new URL('https://arenafcapp.com'),
  title: 'Arena FC — Apostas Inteligentes com Sinais de IA',
  description:
    'Descubra seu perfil de apostador e receba sinais esportivos personalizados para apostar com estratégia e lucrar de verdade.',
  generator: 'v0.app',
  applicationName: 'Arena FC',
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    siteName: 'Arena FC',
    title: 'Arena FC — Apostas Inteligentes com Sinais de IA',
    description:
      'Descubra seu perfil de apostador e receba sinais esportivos personalizados para apostar com estratégia e lucrar de verdade.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Arena FC — Apostas Inteligentes com Sinais de IA',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Arena FC — Apostas Inteligentes com Sinais de IA',
    description:
      'Descubra seu perfil de apostador e receba sinais esportivos personalizados para apostar com estratégia e lucrar de verdade.',
    images: ['/og-image.png'],
  },
  icons: {
    icon: [
      {
        url: '/favicon-arena.png',
        type: 'image/png',
      },
    ],
    shortcut: '/favicon-arena.png',
    apple: '/favicon-arena.png',
  },
}

export const viewport: Viewport = {
  colorScheme: 'light',
  themeColor: '#16a34a',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${inter.variable} ${geistMono.variable} bg-background`}
    >
      <body className="font-sans antialiased">
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
