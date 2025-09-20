import './globals.css'
import { Header } from '@/components/layout/Header'
import { TabNav } from '@/components/layout/TabNav'

export const metadata = {
  title: 'Coffee Collection',
  description: 'Personal coffee bean manager',
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#ffffff',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className="min-h-screen bg-background text-foreground">
        <div className="sticky top-0 z-10 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/75">
          <Header />
          <TabNav />
        </div>
        <main className="px-3 sm:px-4 py-4 sm:py-6 pb-24">
          <div className="container mx-auto">{children}</div>
        </main>
      </body>
    </html>
  )
}
