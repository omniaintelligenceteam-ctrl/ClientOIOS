import type { Metadata, Viewport } from 'next'
import { inter, jetbrainsMono } from './fonts'
import './globals.css'

export const metadata: Metadata = {
  title: { default: 'OIOS Command Center', template: '%s | OIOS' },
  description: 'OIOS — Your AI-Powered Operations Dashboard',
  icons: { icon: '/favicon.ico' },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'OIOS',
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0B1120',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased bg-[#0B1120] text-slate-50`}>
        <div className="bg-grid fixed inset-0 pointer-events-none z-0" />
        <div className="relative z-10">
          {children}
        </div>
      </body>
    </html>
  )
}
